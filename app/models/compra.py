from datetime import datetime, timezone
from decimal import Decimal

from .. import db


class Compra(db.Model):
    __tablename__ = "compra"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    livro_id = db.Column(db.Integer, db.ForeignKey("livro.id"), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    status = db.Column(db.String(20), nullable=False, default="confirmada")
    data_compra = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    leitor = db.relationship("User", foreign_keys=[leitor_id])
    livro = db.relationship("Livro", foreign_keys=[livro_id])
