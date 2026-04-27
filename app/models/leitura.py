from datetime import datetime, timezone

from .. import db


class Leitura(db.Model):
    __tablename__ = "leitura"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    livro_id = db.Column(db.Integer, db.ForeignKey("livro.id"), nullable=False)

    status = db.Column(
        db.String(20),
        nullable=False,
        default="lendo",
    )  # 'quero_ler' | 'lendo' | 'lido'

    nota = db.Column(db.Integer, nullable=True)  # 1..5
    comentario = db.Column(db.Text, nullable=True)

    criado_em = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    atualizado_em = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    leitor = db.relationship("User")
    livro = db.relationship("Livro")

