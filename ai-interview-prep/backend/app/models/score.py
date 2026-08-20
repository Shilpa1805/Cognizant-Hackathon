"""
ORM model: scores table.
"""

import uuid

from sqlalchemy import Column, Float, Text, ForeignKey, JSON
from sqlalchemy.types import Uuid as UUID

from app.database import Base


class Score(Base):
    __tablename__ = "scores"

    score_id: uuid.UUID = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    answer_id: uuid.UUID = Column(
        UUID(as_uuid=True), ForeignKey("answers.answer_id"), nullable=False, unique=True, index=True
    )
    similarity_score: float = Column(Float, nullable=True)
    llm_judge_score: float = Column(Float, nullable=True)
    concept_match_score: float = Column(Float, nullable=True)
    fused_score: float = Column(Float, nullable=True)
    human_calibrated_score: float = Column(Float, nullable=True)
    feedback_text: str = Column(Text, nullable=True)
    # stored as JSON array of strings, e.g. ["CAP theorem", "consistency models"]
    missing_keywords = Column(JSON, nullable=True)
    answer_explanation: str = Column(Text, nullable=True)
    # stored as JSON array of strings
    connecting_keywords = Column(JSON, nullable=True)
    # stored as JSON array of strings
    tips_and_tricks = Column(JSON, nullable=True)
