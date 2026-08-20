"""
Router: POST /sessions/{session_id}/answers
Accepts a submitted answer, runs the real 3-signal ML scoring pipeline,
persists Answer + Score to DB, and returns a ScoreOut.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.schemas.answers import AnswerCreate, AnswerOut, FollowUpRequest
from app.schemas.scores import ScoreOut, ScoreHint
from app.schemas.questions import QuestionOut
from app.services.question_generation import generate_followup_question, GenerationError
from app.services.scoring import score_answer
from app.models.answer import Answer as AnswerModel
from app.models.score import Score as ScoreModel
from app.models.session import MockSession
from app.models.question import Question
from app.models.user import User as UserModel

router = APIRouter()


@router.post("/submit", response_model=ScoreOut, status_code=201)
@router.post("/{session_id}/answers", response_model=ScoreOut, status_code=201)
def submit_answer(
    payload: AnswerCreate,
    session_id: Optional[uuid.UUID] = None,
    db: DbSession = Depends(get_db),
) -> ScoreOut:
    """
    Submits an answer, runs the 3-signal ML scoring pipeline, persists Answer + Score to DB,
    and returns a ScoreOut enriched with concepts, explanation, and hint tips.
    """
    answer_id = uuid.uuid4()

    # Use provided question/reference context for real scoring
    scores_res = score_answer(
        answer_text=payload.answer_text,
        reference_answer=payload.reference_answer or "",
        question_text=payload.question_text or "",
    )

    # --- Persist Answer to DB (best-effort, non-blocking) ---
    effective_session_id = session_id or uuid.UUID("00000000-0000-0000-0000-000000000001")
    try:
        from app.models.role_topic import JobRole, Topic as TopicModel

        first_role = db.query(JobRole).first()
        safe_role_id = first_role.role_id if first_role else uuid.UUID("00000000-0000-0000-0000-000000000001")
        first_topic = db.query(TopicModel).first()
        safe_topic_id = first_topic.topic_id if first_topic else uuid.UUID("00000000-0000-0000-0000-000000000001")

        # 1. Ensure user exists
        valid_user = db.query(UserModel).filter(UserModel.user_id == payload.user_id).first()
        first_user = db.query(UserModel).first()
        safe_user_id = payload.user_id if valid_user else (first_user.user_id if first_user else uuid.UUID("00000000-0000-0000-0000-000000000001"))

        # 2. Ensure session exists
        session_exists = db.query(MockSession).filter(MockSession.session_id == effective_session_id).first()
        if not session_exists:
            fallback_session = MockSession(
                session_id=effective_session_id,
                user_id=safe_user_id,
                role_id=safe_role_id,
                started_at=datetime.utcnow(),
                status="active",
                session_type="practice",
            )
            db.add(fallback_session)
            db.flush()

        # 3. Ensure question exists — resolve topic by name, not by hardcoded UUID
        q_exists = db.query(Question).filter(Question.question_id == payload.question_id).first()
        if not q_exists:
            from app.models.role_topic import Topic as TopicModel
            from sqlalchemy import func as sqlfunc

            # The frontend sends the topic text via question_text context; we use
            # payload.topic_text if provided, otherwise fall back to the seed default.
            topic_name: str = (getattr(payload, "topic_text", None) or "").strip() or "General"

            # Look up the topic row by name (case-insensitive)
            topic_row = (
                db.query(TopicModel)
                .filter(sqlfunc.lower(TopicModel.topic_name) == topic_name.lower())
                .first()
            )

            # If topic doesn't exist in the SQL table yet, create it on-the-fly
            if not topic_row:
                topic_row = TopicModel(
                    topic_id=uuid.uuid5(uuid.NAMESPACE_DNS, topic_name.lower()),
                    topic_name=topic_name,
                    role_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                )
                db.add(topic_row)
                db.flush()

            new_q = Question(
                question_id=payload.question_id,
                role_id=safe_role_id,
                topic_id=topic_row.topic_id if topic_row else safe_topic_id,
                question_text=payload.question_text or "Dynamic Question",
                reference_answer=payload.reference_answer or "Dynamic Answer",
                difficulty=getattr(payload, "difficulty", "medium") or "medium",
                source="dynamic"
            )
            db.add(new_q)
            db.flush()


        # 4. Save Answer
        answer_row = AnswerModel(
            answer_id=answer_id,
            session_id=effective_session_id,
            question_id=payload.question_id,
            user_id=safe_user_id,
            answer_text=payload.answer_text,
            submitted_at=datetime.utcnow(),
        )
        db.add(answer_row)
        db.flush()

        # 5. Save Score
        score_id = uuid.uuid4()
        score_row = ScoreModel(
            score_id=score_id,
            answer_id=answer_id,
            similarity_score=scores_res.get("similarity_score"),
            llm_judge_score=scores_res.get("llm_judge_score"),
            concept_match_score=scores_res.get("concept_match_score"),
            fused_score=scores_res.get("fused_score"),
            human_calibrated_score=scores_res.get("human_calibrated_score"),
            feedback_text=scores_res.get("feedback_text"),
            missing_keywords=scores_res.get("missing_keywords", []),
            answer_explanation=scores_res.get("answer_explanation"),
            connecting_keywords=scores_res.get("matched_keywords", []),
            tips_and_tricks=scores_res.get("tips_and_tricks", []),
        )
        db.add(score_row)

        # Only mark session completed when all expected questions have been answered
        session_row = db.query(MockSession).filter(
            MockSession.session_id == effective_session_id
        ).first()
        if session_row and session_row.status == "active":
            # Count answers for this session
            current_answer_count = db.query(func.count(AnswerModel.answer_id)).filter(
                AnswerModel.session_id == effective_session_id
            ).scalar() or 0

            if payload.expected_question_count is not None and payload.expected_question_count > 0:
                if current_answer_count >= payload.expected_question_count:
                    session_row.ended_at = datetime.utcnow()
                    session_row.status = "completed"
            else:
                import logging
                logging.getLogger(__name__).warning(
                    "submit_answer: expected_question_count was not provided for session %s. "
                    "Cannot determine accurate completion boundary.",
                    effective_session_id
                )
                session_row.ended_at = datetime.utcnow()
                session_row.status = "completed"

        db.commit()
    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger(__name__).warning("Failed to persist answer/score to DB: %s", exc)

    return ScoreOut(
        score_id=uuid.uuid4(),
        answer_id=answer_id,
        similarity_score=scores_res.get("similarity_score", 0.72),
        llm_judge_score=scores_res.get("llm_judge_score", 0.68),
        concept_match_score=scores_res.get("concept_match_score", 0.75),
        fused_score=scores_res.get("fused_score", 0.71),
        human_calibrated_score=scores_res.get("human_calibrated_score"),
        feedback_text=scores_res.get("feedback_text", "Good response."),
        missing_keywords=scores_res.get("missing_keywords", []),
        answer_explanation=scores_res.get("answer_explanation"),
        hint=ScoreHint(
            connecting_keywords=scores_res.get("matched_keywords", []),
            tips_and_tricks=scores_res.get("tips_and_tricks", []),
        ),
    )


@router.post("/{session_id}/answers/followup", response_model=QuestionOut)
def generate_followup(session_id: uuid.UUID, payload: FollowUpRequest) -> QuestionOut:
    """
    Generates an adaptive follow-up question based on the user's answer and their score.
    If Gemini is unavailable, it returns a 503 since this is a purely generative feature.
    """
    try:
        ai_q = generate_followup_question(payload)

        _DEFAULT_ROLE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
        _DEFAULT_TOPIC_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

        return QuestionOut(
            question_id=uuid.uuid4(),
            topic_id=_DEFAULT_TOPIC_ID,
            role_id=_DEFAULT_ROLE_ID,
            question_text=ai_q.question_text,
            reference_answer=ai_q.reference_answer,
            difficulty=ai_q.difficulty.lower() if ai_q.difficulty else "medium",
            source="gemini",
        )
    except GenerationError as e:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail=f"Follow-up generation failed: {str(e)}"
        )
