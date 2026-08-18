"""
Router: POST /sessions/{session_id}/answers
Accepts a submitted answer and immediately returns a mock Score.
TODO(scoring-pair): Replace mock score with real scoring pipeline from services/scoring.py.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter

from app.schemas.answers import AnswerCreate, AnswerOut, FollowUpRequest
from app.schemas.scores import ScoreOut
from app.schemas.questions import QuestionOut
from app.services.question_generation import generate_followup_question, GenerationError

router = APIRouter()


@router.post("/{session_id}/answers", response_model=ScoreOut, status_code=201)
def submit_answer(session_id: uuid.UUID, payload: AnswerCreate) -> ScoreOut:
    """
    STUB — persists nothing; returns a plausible-looking score object.
    TODO(scoring-pair): Persist Answer to DB, call services.scoring.score_answer(),
                        persist Score to DB, return real scores.
    """
    answer_id = uuid.uuid4()

    # -----------------------------------------------------------------------
    # Placeholder scores — hardcoded floats so frontend can render feedback UI
    # -----------------------------------------------------------------------
    return ScoreOut(
        score_id=uuid.uuid4(),
        answer_id=answer_id,
        similarity_score=0.72,
        llm_judge_score=0.68,
        concept_match_score=0.75,
        fused_score=0.71,
        human_calibrated_score=None,  # filled in by human reviewers later
        feedback_text=(
            "Good answer! You covered the main concepts. Consider also mentioning "
            "trade-offs and real-world use cases to strengthen your response."
        ),
        missing_keywords=["trade-offs", "latency", "fault tolerance"],
    )

@router.post("/{session_id}/answers/followup", response_model=QuestionOut)
def generate_followup(session_id: uuid.UUID, payload: FollowUpRequest) -> QuestionOut:
    """
    Generates an adaptive follow-up question based on the user's answer and their score.
    If Gemini is unavailable, it returns a 503 since this is a purely generative feature.
    """
    try:
        ai_q = generate_followup_question(payload)
        
        # We reuse the default UUIDs since it's a generated follow-up
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
