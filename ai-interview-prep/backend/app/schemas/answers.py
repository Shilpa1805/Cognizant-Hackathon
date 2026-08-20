"""
Pydantic schemas for answers (posted under /sessions/{id}/answers).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel
from app.schemas.scores import ScoreOut


class AnswerCreate(BaseModel):
    question_id: UUID
    user_id: UUID
    answer_text: str
    question_text: Optional[str] = None           # needed by scoring pipeline
    reference_answer: Optional[str] = None        # gold answer for comparison
    topic_text: Optional[str] = None              # topic name for correct DB mapping
    difficulty: Optional[str] = None              # difficulty level for DB storage
    expected_question_count: Optional[int] = None # total questions in this session


class AnswerOut(BaseModel):
    answer_id: UUID
    session_id: UUID
    question_id: UUID
    user_id: UUID
    answer_text: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


class FollowUpRequest(BaseModel):
    original_question: str
    user_answer: str
    score: ScoreOut
