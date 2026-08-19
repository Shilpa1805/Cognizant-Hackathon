"""
Router: POST /sessions/{session_id}/answers
Accepts a submitted answer, runs the real 3-signal ML scoring pipeline,
and returns a ScoreOut with genuine similarity, concept-match and LLM scores.
"""

import uuid
from fastapi import APIRouter

from app.schemas.answers import AnswerCreate, FollowUpRequest
from app.schemas.scores import ScoreOut
from app.schemas.questions import QuestionOut
from app.services.scoring import score_answer
from app.services.question_generation import generate_followup_question, GenerationError

router = APIRouter()


@router.post("/{session_id}/answers", response_model=ScoreOut, status_code=201)
def submit_answer(session_id: uuid.UUID, payload: AnswerCreate) -> ScoreOut:
    """
    Runs the real 3-signal scoring pipeline (sentence-transformers + spaCy + Gemini judge)
    on the submitted answer and returns genuine scores.

    Scoring signals:
      - similarity_score   : sentence-transformer cosine sim vs reference answer (offline)
      - concept_match_score: spaCy noun-chunk concept overlap vs reference answer
      - llm_judge_score    : Gemini LLM correctness / clarity / structure rating
      - fused_score        : 0.35*sim + 0.35*concept + 0.30*llm_judge
    """
    answer_id = uuid.uuid4()

    # Pull scoring inputs from payload — fall back to answer itself if not provided
    answer_text     = payload.answer_text
    question_text   = payload.question_text   or ""
    reference_answer = payload.reference_answer or ""

    # Run the real ML scoring pipeline
    result = score_answer(
        answer_text=answer_text,
        reference_answer=reference_answer,
        question_text=question_text,
    )

    return ScoreOut(
        score_id=uuid.uuid4(),
        answer_id=answer_id,
        similarity_score=result["similarity_score"],
        llm_judge_score=result["llm_judge_score"],
        concept_match_score=result["concept_match_score"],
        fused_score=result["fused_score"],
        human_calibrated_score=result.get("human_calibrated_score"),
        feedback_text=result["feedback_text"],
        missing_keywords=result["missing_keywords"],
    )


@router.post("/{session_id}/answers/followup", response_model=QuestionOut)
def generate_followup(session_id: uuid.UUID, payload: FollowUpRequest) -> QuestionOut:
    """
    Generates an adaptive follow-up question based on the user's answer and their score.
    If Gemini is unavailable, returns a 503.
    """
    try:
        ai_q = generate_followup_question(payload)

        _DEFAULT_ROLE_ID  = uuid.UUID("11111111-1111-1111-1111-111111111111")
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
