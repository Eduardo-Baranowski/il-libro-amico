"""Add leitura table

Revision ID: 3c2a1e4b7f10
Revises: 275944bf37ec
Create Date: 2026-04-27

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3c2a1e4b7f10"
down_revision = "275944bf37ec"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "leitura",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("leitor_id", sa.Integer(), nullable=False),
        sa.Column("livro_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="lendo"),
        sa.Column("nota", sa.Integer(), nullable=True),
        sa.Column("comentario", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["leitor_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["livro_id"], ["livro.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leitura_leitor_id", "leitura", ["leitor_id"])
    op.create_index("ix_leitura_livro_id", "leitura", ["livro_id"])
    op.create_index("ix_leitura_criado_em", "leitura", ["criado_em"])


def downgrade():
    op.drop_index("ix_leitura_criado_em", table_name="leitura")
    op.drop_index("ix_leitura_livro_id", table_name="leitura")
    op.drop_index("ix_leitura_leitor_id", table_name="leitura")
    op.drop_table("leitura")

