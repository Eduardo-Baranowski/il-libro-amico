from datetime import datetime, timezone

from .. import db


class FeedComment(db.Model):
    __tablename__ = "feed_comment"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitura_id = db.Column(db.Integer, db.ForeignKey("leitura.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    criado_em = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    leitura = db.relationship("Leitura")
    user = db.relationship("User")
