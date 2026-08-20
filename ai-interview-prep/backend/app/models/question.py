"""
ORM model: questions table.
"""

import uuid

from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.types import Uuid as UUID

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    question_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topic_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("topics.topic_id"), nullable=False, index=True
    )
    role_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("job_roles.role_id"), nullable=False, index=True
    )
    question_text: str = Column(Text, nullable=False)
    reference_answer: str = Column(Text, nullable=True)
    difficulty: str = Column(String(50), nullable=True)  # e.g. "easy", "medium", "hard"
    source: str = Column(String(255), nullable=True)
