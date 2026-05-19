"""add genero to livro

Revision ID: c4e8a1b2d903
Revises: a5e66ff3117b
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa


revision = "c4e8a1b2d903"
down_revision = "a5e66ff3117b"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("livro", schema=None) as batch_op:
        batch_op.add_column(sa.Column("genero", sa.String(length=100), nullable=True))


def downgrade():
    with op.batch_alter_table("livro", schema=None) as batch_op:
        batch_op.drop_column("genero")
