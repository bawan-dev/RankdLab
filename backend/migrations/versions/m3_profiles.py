"""Add Rocket League profiles, append-only ranks and replay coaching context.

Revision ID: m3_profiles
Revises: d468c480c1a7
"""

import sqlalchemy as sa
from alembic import op

revision = "m3_profiles"
down_revision = "d468c480c1a7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rocket_profiles",
        sa.Column(
            "user_id",
            sa.String(32),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("display_name", sa.String(60), nullable=False),
        sa.Column("platform", sa.String(30), nullable=False),
        sa.Column("onboarding_complete", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "rank_history",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(32),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("playlist", sa.String(3), nullable=False),
        sa.Column("rank", sa.String(40), nullable=False),
        sa.Column("division", sa.Integer(), nullable=True),
        sa.Column("mmr", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.add_column(
        "replays", sa.Column("coaching_context", sa.JSON(), nullable=False, server_default="{}")
    )
    op.add_column("replays", sa.Column("requested_playlist", sa.String(3), nullable=True))


def downgrade():
    op.drop_column("replays", "requested_playlist")
    op.drop_column("replays", "coaching_context")
    op.drop_table("rank_history")
    op.drop_table("rocket_profiles")
