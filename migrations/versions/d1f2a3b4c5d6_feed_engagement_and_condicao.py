"""feed engagement and livro condicao

Revision ID: d1f2a3b4c5d6
Revises: c4e8a1b2d903
Create Date: 2026-06-03
"""

from alembic import op
import sqlalchemy as sa


revision = "d1f2a3b4c5d6"
down_revision = "c4e8a1b2d903"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "livro",
        sa.Column("condicao", sa.String(length=30), nullable=True, server_default="novo"),
    )

    op.create_table(
        "feed_like",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("leitura_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["leitura_id"], ["leitura.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("leitura_id", "user_id", name="uq_feed_like"),
    )

    op.create_table(
        "feed_comment",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("leitura_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("conteudo", sa.Text(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["leitura_id"], ["leitura.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("feed_comment")
    op.drop_table("feed_like")
    op.drop_column("livro", "condicao")
