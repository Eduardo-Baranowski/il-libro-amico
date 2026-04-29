from datetime import datetime, timezone

from .. import db


class Friendship(db.Model):
    __tablename__ = "friendship"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    addressee_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    criado_em = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),)
