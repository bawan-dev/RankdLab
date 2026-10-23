"""Add separate owner tactical reviews and subjective feedback ratings."""

import sqlalchemy as sa
from alembic import op

revision = "m4_reviews"
down_revision = "m3_profiles"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("feedback", sa.Column("rating", sa.String(20), nullable=True))
    op.create_table(
        "tactical_reviews",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column(
            "replay_id",
            sa.String(32),
            sa.ForeignKey("replays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_tactical_reviews_replay_id", "tactical_reviews", ["replay_id"])


def downgrade():
    op.drop_table("tactical_reviews")
    op.drop_column("feedback", "rating")
