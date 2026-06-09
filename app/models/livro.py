from datetime import datetime, timezone
from decimal import Decimal

from .. import db


class Livro(db.Model):
    __tablename__ = "livro"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    editor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    titulo = db.Column(db.String(200), nullable=False)
    autor = db.Column(db.String(200), nullable=False)
    preco = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    estoque = db.Column(db.Integer, nullable=False, default=0)
    genero = db.Column(db.String(100), nullable=True)
    condicao = db.Column(db.String(30), nullable=True, default="novo")
    descricao = db.Column(db.Text, nullable=True)
    imagem = db.Column(db.String(255), nullable=True)
    data_cadastro = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    editor = db.relationship("User", backref="livros")
