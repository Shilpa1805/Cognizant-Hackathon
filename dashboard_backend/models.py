from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic: Mapped[str] = mapped_column(String, index=True, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, default="Medium")

    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="question")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    question: Mapped[Optional["Question"]] = relationship("Question", back_populates="sessions")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="session", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    missing_keywords: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # Comma-separated or JSON list

    session: Mapped[Optional["Session"]] = relationship("Session", back_populates="answers")
    scores: Mapped[List["Score"]] = relationship("Score", back_populates="answer", cascade="all, delete-orphan")


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    answer_id: Mapped[int] = mapped_column(Integer, ForeignKey("answers.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    topic: Mapped[str] = mapped_column(String, index=True, nullable=False)
    fused_score: Mapped[float] = mapped_column(Float, nullable=False)  # float 0.0 to 1.0

    answer: Mapped[Optional["Answer"]] = relationship("Answer", back_populates="scores")

