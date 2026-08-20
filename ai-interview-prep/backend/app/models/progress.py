"""
ORM models: topic_progress and study_plan tables.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.types import Uuid as UUID

from app.database import Base


class TopicProgress(Base):
    __tablename__ = "topic_progress"

    id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    topic_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("topics.topic_id"), nullable=False
    )
    avg_score: float = Column(Float, nullable=True)
    attempts_count: int = Column(Integer, nullable=False, default=0)
    last_updated: datetime = Column(DateTime, nullable=False, default=datetime.utcnow)


class StudyPlan(Base):
    __tablename__ = "study_plan"

    id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    topic_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("topics.topic_id"), nullable=False
    )
    priority_rank: int = Column(Integer, nullable=False)
    # JSON array of resource strings / URLs
    recommended_resources = Column(JSON, nullable=True)
    generated_at: datetime = Column(DateTime, nullable=False, default=datetime.utcnow)
