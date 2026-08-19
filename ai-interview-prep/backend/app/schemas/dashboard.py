"""
Pydantic schemas for dashboard endpoints.
"""

from datetime import datetime
from uuid import UUID
from typing import List, Optional

from pydantic import BaseModel


class TopicProgressOut(BaseModel):
    id: UUID
    user_id: UUID
    topic_id: UUID
    avg_score: Optional[float] = None
    attempts_count: int
    last_updated: datetime

    model_config = {"from_attributes": True}


class StudyPlanOut(BaseModel):
    id: UUID
    user_id: UUID
    topic_id: UUID
    priority_rank: int
    recommended_resources: Optional[List[str]] = None
    generated_at: datetime

    model_config = {"from_attributes": True}


class DashboardTopicAverageOut(BaseModel):
    topic_id: UUID
    topic_name: str
    avg_score: float
    question_frequency: int


class DashboardStudyPlanItemOut(BaseModel):
    topic_id: UUID
    topic_name: str
    priority_rank: int
    recommended_focus: str
    avg_score: float
    question_frequency: int


class DashboardSessionHistoryOut(BaseModel):
    session_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    overall_session_score: Optional[float] = None


class DashboardSummaryOut(BaseModel):
    user_id: UUID
    topic_average_scores: List[DashboardTopicAverageOut]
    study_plan: List[DashboardStudyPlanItemOut]
    session_history: List[DashboardSessionHistoryOut]
