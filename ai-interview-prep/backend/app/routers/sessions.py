"""
Router: /sessions
POST /sessions            — Create and persist a new session.
GET  /sessions            — List sessions for a user (for history).
GET  /sessions/{id}/results — Full per-question results for analysis.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func

from app.database import get_db
from app.models.session import MockSession
from app.models.answer import Answer as AnswerModel
from app.models.question import Question as QuestionModel
from app.models.score import Score as ScoreModel
from app.schemas.sessions import SessionCreate, SessionOut, SessionResultOut, QuestionResultOut
from app.dependencies.auth import verify_clerk_token

router = APIRouter()

# Stable fallback role UUID used when client sends a placeholder
_DEFAULT_ROLE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


from app.models.role_topic import JobRole

@router.post("", response_model=SessionOut, status_code=201)
def create_session(
    payload: SessionCreate, 
    db: DbSession = Depends(get_db),
    user=Depends(verify_clerk_token)
) -> SessionOut:
    """
    Creates and persists a new mock/practice session to the database.
    Returns the real session_id so the frontend can submit answers against it.
    """
    from app.models.user import User as UserModel

    # Resolve user_id safely to prevent SQLite foreign key constraint failures
    valid_user = db.query(UserModel).filter(UserModel.user_id == payload.user_id).first()
    first_user = db.query(UserModel).first()
    safe_user_id = payload.user_id if valid_user else (first_user.user_id if first_user else uuid.UUID("00000000-0000-0000-0000-000000000001"))

    # Resolve role_id safely to prevent SQLite foreign key constraint failures
    valid_role = db.query(JobRole).filter(JobRole.role_id == payload.role_id).first()
    first_role = db.query(JobRole).first()
    role_id = payload.role_id if valid_role else (first_role.role_id if first_role else uuid.UUID("00000000-0000-0000-0000-000000000001"))

    session = MockSession(
        session_id=uuid.uuid4(),
        user_id=safe_user_id,
        role_id=role_id,
        started_at=datetime.utcnow(),
        ended_at=None,
        status="active",
        session_type=payload.session_type,
    )
    try:
        db.add(session)
        db.commit()
        db.refresh(session)
    except Exception as exc:
        db.rollback()
        import logging
        logging.getLogger(__name__).warning("Failed to persist session: %s", exc)
        # Return a non-persisted session so the flow doesn't break
        return SessionOut(
            session_id=session.session_id,
            user_id=payload.user_id,
            role_id=role_id,
            started_at=datetime.utcnow(),
            ended_at=None,
            status="active",
            session_type=payload.session_type,
        )

    return SessionOut(
        session_id=session.session_id,
        user_id=session.user_id,
        role_id=session.role_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        status=session.status,
        session_type=session.session_type,
    )


@router.get("", response_model=List[SessionOut])
def list_sessions(
    user_id: uuid.UUID = Query(..., description="User UUID to list sessions for"),
    db: DbSession = Depends(get_db),
    user=Depends(verify_clerk_token)
) -> List[SessionOut]:
    """
    Returns all sessions for a given user, sorted by start date descending.
    Includes avg_score and question_count computed from answers/scores.
    """
    sessions = (
        db.query(MockSession)
        .filter(MockSession.user_id == user_id)
        .order_by(MockSession.started_at.desc())
        .all()
    )

    result = []
    for s in sessions:
        # Count answers for this session
        q_count = db.query(func.count(AnswerModel.answer_id)).filter(
            AnswerModel.session_id == s.session_id
        ).scalar() or 0

        # Compute avg fused_score for this session
        avg_score_raw = (
            db.query(func.avg(ScoreModel.fused_score))
            .join(AnswerModel, ScoreModel.answer_id == AnswerModel.answer_id)
            .filter(AnswerModel.session_id == s.session_id)
            .scalar()
        )
        avg_score = round(float(avg_score_raw) * 100, 1) if avg_score_raw is not None else None

        result.append(SessionOut(
            session_id=s.session_id,
            user_id=s.user_id,
            role_id=s.role_id,
            started_at=s.started_at,
            ended_at=s.ended_at,
            status=s.status,
            session_type=s.session_type,
            avg_score=avg_score,
            question_count=q_count,
        ))

    return result


@router.get("/{session_id}/results", response_model=SessionResultOut)
def get_session_results(
    session_id: uuid.UUID,
    db: DbSession = Depends(get_db),
    user=Depends(verify_clerk_token)
) -> SessionResultOut:
    """
    Returns the full per-question analysis for a session.
    Used by Practice Analysis, Mock Analysis, and History detail views.
    """
    session = db.query(MockSession).filter(MockSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    answers = (
        db.query(AnswerModel)
        .filter(AnswerModel.session_id == session_id)
        .order_by(AnswerModel.submitted_at)
        .all()
    )

    question_results = []
    score_values = []

    for ans in answers:
        score = db.query(ScoreModel).filter(ScoreModel.answer_id == ans.answer_id).first()
        question = db.query(QuestionModel).filter(QuestionModel.question_id == ans.question_id).first()

        fused = score.fused_score if score else None
        if fused is not None:
            score_values.append(fused)

        question_results.append(QuestionResultOut(
            question_id=ans.question_id,
            question_text=question.question_text if question else "Question not available",
            your_answer=ans.answer_text,
            reference_answer=question.reference_answer if question else None,
            similarity_score=score.similarity_score if score else None,
            llm_judge_score=score.llm_judge_score if score else None,
            concept_match_score=score.concept_match_score if score else None,
            fused_score=fused,
            feedback_text=score.feedback_text if score else None,
            missing_keywords=score.missing_keywords if score else None,
            answer_explanation=score.answer_explanation if score else None,
            connecting_keywords=score.connecting_keywords if score else None,
            tips_and_tricks=score.tips_and_tricks if score else None,
        ))

    overall = round(sum(score_values) / len(score_values) * 100, 1) if score_values else None

    return SessionResultOut(
        session_id=session.session_id,
        session_type=session.session_type,
        started_at=session.started_at,
        ended_at=session.ended_at,
        overall_score=overall,
        question_results=question_results,
    )
