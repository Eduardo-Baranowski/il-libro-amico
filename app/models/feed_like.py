from datetime import datetime, timezone

from .. import db


class FeedLike(db.Model):
    __tablename__ = "feed_like"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitura_id = db.Column(db.Integer, db.ForeignKey("leitura.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    criado_em = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    leitura = db.relationship("Leitura")
    user = db.relationship("User")

    __table_args__ = (
        db.UniqueConstraint("leitura_id", "user_id", name="uq_feed_like"),
    )
