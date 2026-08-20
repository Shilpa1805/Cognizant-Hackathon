"""
ORM model: answers table.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.types import Uuid as UUID

from app.database import Base


class Answer(Base):
    __tablename__ = "answers"

    answer_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("mock_sessions.session_id"), nullable=False, index=True
    )
    question_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("questions.question_id"), nullable=False
    )
    user_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False
    )
    answer_text: str = Column(Text, nullable=False)
    submitted_at: datetime = Column(DateTime, nullable=False, default=datetime.utcnow)
