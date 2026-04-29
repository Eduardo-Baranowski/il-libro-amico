"""Add estoque to livro and create compra table

Revision ID: a7f2f1e9c112
Revises: 9b1f0d2a7c44
Create Date: 2026-04-29
"""

from alembic import op
import sqlalchemy as sa


revision = "a7f2f1e9c112"
down_revision = "9b1f0d2a7c44"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("livro", sa.Column("estoque", sa.Integer(), nullable=False, server_default="0"))
    op.alter_column("livro", "estoque", server_default=None)

    op.create_table(
        "compra",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("leitor_id", sa.Integer(), nullable=False),
        sa.Column("livro_id", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="confirmada"),
        sa.Column("data_compra", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["leitor_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["livro_id"], ["livro.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("compra")
    op.drop_column("livro", "estoque")
