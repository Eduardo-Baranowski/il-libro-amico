from datetime import datetime, timezone

from .. import db


class Request(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    editor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    resposta = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='pendente') # 'pendente', 'respondida'
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    leitor = db.relationship('User', foreign_keys=[leitor_id])
    editor = db.relationship('User', foreign_keys=[editor_id])
