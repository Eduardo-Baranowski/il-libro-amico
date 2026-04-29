from datetime import datetime, timezone

from .. import db


class Message(db.Model):
    __tablename__ = "message"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    lida = db.Column(db.Boolean, nullable=False, default=False)
    data_envio = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
