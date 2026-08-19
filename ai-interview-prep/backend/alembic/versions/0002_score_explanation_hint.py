"""Add answer_explanation, connecting_keywords, and tips_and_tricks to scores table.

Revision ID: 0002_score_explanation_hint
Revises: 0001_initial
Create Date: 2026-08-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_score_explanation_hint"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("scores", sa.Column("answer_explanation", sa.Text(), nullable=True))
    op.add_column("scores", sa.Column("connecting_keywords", sa.JSON().with_variant(postgresql.JSONB, "postgresql"), nullable=True))
    op.add_column("scores", sa.Column("tips_and_tricks", sa.JSON().with_variant(postgresql.JSONB, "postgresql"), nullable=True))


def downgrade() -> None:
    op.drop_column("scores", "tips_and_tricks")
    op.drop_column("scores", "connecting_keywords")
    op.drop_column("scores", "answer_explanation")
