from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class TopicScore(BaseModel):
    topic: str
    avg_score: float
    num_attempts: int


class StudyPlanItem(BaseModel):
    topic: str
    priority_rank: int
    priority_score: float
    avg_score: float


class SessionHistoryItem(BaseModel):
    session_id: int
    topic: str
    question_text: str
    score: float
    timestamp: str
    feedback_text: Optional[str] = None
    missing_keywords: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    topic_scores: List[TopicScore]
    study_plan: List[StudyPlanItem]
    session_history: List[SessionHistoryItem]

    model_config = ConfigDict(from_attributes=True)
