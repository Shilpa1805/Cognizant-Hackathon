"""Initial migration — creates all tables for the AI Interview Prep schema.

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-16

Tables created:
  users, job_roles, topics, questions, mock_sessions, answers,
  session_questions, scores, topic_progress, study_plan
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="candidate"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── job_roles ──────────────────────────────────────────────────────────
    op.create_table(
        "job_roles",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("role_name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.String(1024), nullable=True),
    )

    # ── topics ─────────────────────────────────────────────────────────────
    op.create_table(
        "topics",
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_roles.role_id"),
            nullable=False,
        ),
        sa.Column("topic_name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
    )
    op.create_index("ix_topics_role_id", "topics", ["role_id"])

    # ── questions ──────────────────────────────────────────────────────────
    op.create_table(
        "questions",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "topic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("topics.topic_id"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_roles.role_id"),
            nullable=False,
        ),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("reference_answer", sa.Text, nullable=True),
        sa.Column("difficulty", sa.String(50), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
    )
    op.create_index("ix_questions_topic_id", "questions", ["topic_id"])
    op.create_index("ix_questions_role_id", "questions", ["role_id"])

    # ── mock_sessions ──────────────────────────────────────────────────────
    op.create_table(
        "mock_sessions",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_roles.role_id"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
    )
    op.create_index("ix_mock_sessions_user_id", "mock_sessions", ["user_id"])

    # ── answers (must exist before session_questions for FK) ───────────────
    op.create_table(
        "answers",
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mock_sessions.session_id"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("questions.question_id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id"),
            nullable=False,
        ),
        sa.Column("answer_text", sa.Text, nullable=False),
        sa.Column("submitted_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_answers_session_id", "answers", ["session_id"])

    # ── session_questions ──────────────────────────────────────────────────
    op.create_table(
        "session_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("mock_sessions.session_id"),
            nullable=False,
        ),
        sa.Column(
            "question_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("questions.question_id"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer, nullable=False),
        sa.Column(
            "follow_up_of_answer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("answers.answer_id"),
            nullable=True,
        ),
    )
    op.create_index("ix_session_questions_session_id", "session_questions", ["session_id"])

    # ── scores ─────────────────────────────────────────────────────────────
    op.create_table(
        "scores",
        sa.Column("score_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "answer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("answers.answer_id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("similarity_score", sa.Float, nullable=True),
        sa.Column("llm_judge_score", sa.Float, nullable=True),
        sa.Column("concept_match_score", sa.Float, nullable=True),
        sa.Column("fused_score", sa.Float, nullable=True),
        sa.Column("human_calibrated_score", sa.Float, nullable=True),
        sa.Column("feedback_text", sa.Text, nullable=True),
        sa.Column("missing_keywords", sa.JSON().with_variant(postgresql.JSONB, "postgresql"), nullable=True),
    )
    op.create_index("ix_scores_answer_id", "scores", ["answer_id"])

    # ── topic_progress ─────────────────────────────────────────────────────
    op.create_table(
        "topic_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id"),
            nullable=False,
        ),
        sa.Column(
            "topic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("topics.topic_id"),
            nullable=False,
        ),
        sa.Column("avg_score", sa.Float, nullable=True),
        sa.Column("attempts_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_updated", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_topic_progress_user_id", "topic_progress", ["user_id"])

    # ── study_plan ─────────────────────────────────────────────────────────
    op.create_table(
        "study_plan",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id"),
            nullable=False,
        ),
        sa.Column(
            "topic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("topics.topic_id"),
            nullable=False,
        ),
        sa.Column("priority_rank", sa.Integer, nullable=False),
        sa.Column("recommended_resources", sa.JSON().with_variant(postgresql.JSONB, "postgresql"), nullable=True),
        sa.Column("generated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_study_plan_user_id", "study_plan", ["user_id"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("study_plan")
    op.drop_table("topic_progress")
    op.drop_table("scores")
    op.drop_table("session_questions")
    op.drop_table("answers")
    op.drop_table("mock_sessions")
    op.drop_table("questions")
    op.drop_table("topics")
    op.drop_table("job_roles")
    op.drop_table("users")
