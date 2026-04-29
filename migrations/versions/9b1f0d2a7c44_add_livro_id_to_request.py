"""Add livro_id to request table

Revision ID: 9b1f0d2a7c44
Revises: 3c2a1e4b7f10
Create Date: 2026-04-29

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9b1f0d2a7c44"
down_revision = "3c2a1e4b7f10"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("request", sa.Column("livro_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_request_livro_id", "request", "livro", ["livro_id"], ["id"])


def downgrade():
    op.drop_constraint("fk_request_livro_id", "request", type_="foreignkey")
    op.drop_column("request", "livro_id")
