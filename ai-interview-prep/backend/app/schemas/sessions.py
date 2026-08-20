"""
Pydantic schemas for /sessions endpoint.
"""

from datetime import datetime
from uuid import UUID
from typing import List, Optional

from pydantic import BaseModel


class SessionCreate(BaseModel):
    user_id: UUID
    role_id: UUID
    session_type: str = "practice"  # practice | mock


class SessionOut(BaseModel):
    session_id: UUID
    user_id: UUID
    role_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str
    session_type: str = "practice"
    avg_score: Optional[float] = None
    question_count: Optional[int] = None

    model_config = {"from_attributes": True}


class QuestionResultOut(BaseModel):
    """Per-question result for session detail view."""
    question_id: UUID
    question_text: str
    your_answer: str
    reference_answer: Optional[str] = None
    similarity_score: Optional[float] = None
    llm_judge_score: Optional[float] = None
    concept_match_score: Optional[float] = None
    fused_score: Optional[float] = None
    feedback_text: Optional[str] = None
    missing_keywords: Optional[List[str]] = None
    answer_explanation: Optional[str] = None
    connecting_keywords: Optional[List[str]] = None
    tips_and_tricks: Optional[List[str]] = None


class SessionResultOut(BaseModel):
    """Full session results with all per-question details."""
    session_id: UUID
    session_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    overall_score: Optional[float] = None
    question_results: List[QuestionResultOut]
