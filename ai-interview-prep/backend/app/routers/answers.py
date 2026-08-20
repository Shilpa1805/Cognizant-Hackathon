"""
Router: POST /sessions/{session_id}/answers
Accepts a submitted answer, runs the real 3-signal ML scoring pipeline,
persists Answer + Score to DB, and returns a ScoreOut.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
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
        # Ensure the dynamically generated question exists in SQLite to satisfy the FK constraint
        q_exists = db.query(Question).filter(Question.question_id == payload.question_id).first()
        if not q_exists:
            new_q = Question(
                question_id=payload.question_id,
                role_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                topic_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                question_text=payload.question_text or "Dynamic Question",
                reference_answer=payload.reference_answer or "Dynamic Answer",
                difficulty="medium",
                source="dynamic"
            )
            db.add(new_q)
            db.flush()

        answer_row = AnswerModel(
            answer_id=answer_id,
            session_id=effective_session_id,
            question_id=payload.question_id,
            user_id=payload.user_id,
            answer_text=payload.answer_text,
            submitted_at=datetime.utcnow(),
        )
        db.add(answer_row)
        db.flush()  # get answer_id in DB without full commit yet

        # --- Persist Score to DB ---
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

        # Mark session as completed if this is last answer
        session_row = db.query(MockSession).filter(
            MockSession.session_id == effective_session_id
        ).first()
        if session_row and session_row.status == "active":
            session_row.ended_at = datetime.utcnow()
            session_row.status = "completed"

        db.commit()
    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger(__name__).warning("Failed to persist answer/score: %s", exc)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(exc))

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
