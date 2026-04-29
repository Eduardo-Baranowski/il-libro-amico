"""Add follow friendship and message tables

Revision ID: b19c2a44f201
Revises: a7f2f1e9c112
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "b19c2a44f201"
down_revision = "a7f2f1e9c112"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "follow",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("follower_id", sa.Integer(), nullable=False),
        sa.Column("following_id", sa.Integer(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["follower_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["following_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
    )

    op.create_table(
        "friendship",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("requester_id", sa.Integer(), nullable=False),
        sa.Column("addressee_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["requester_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["addressee_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
    )

    op.create_table(
        "message",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("receiver_id", sa.Integer(), nullable=False),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.Column("lida", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("data_envio", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["sender_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["receiver_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("message")
    op.drop_table("friendship")
    op.drop_table("follow")
