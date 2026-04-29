from datetime import datetime, timezone
from decimal import Decimal
from .. import db

class Pedido(db.Model):
    __tablename__ = "pedido"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    leitor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    data_pedido = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), nullable=False, default="pendente") # pendente, pago, enviado, entregue, cancelado
    total = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    
    # Informações de Entrega
    endereco_rua = db.Column(db.String(200), nullable=True)
    endereco_numero = db.Column(db.String(20), nullable=True)
    endereco_bairro = db.Column(db.String(100), nullable=True)
    endereco_cidade = db.Column(db.String(100), nullable=True)
    endereco_estado = db.Column(db.String(2), nullable=True)
    endereco_cep = db.Column(db.String(20), nullable=True)
    
    # Método de Pagamento (Simulado)
    metodo_pagamento = db.Column(db.String(50), nullable=True)

    leitor = db.relationship("User", foreign_keys=[leitor_id])
    itens = db.relationship("ItemPedido", backref="pedido", cascade="all, delete-orphan")

class ItemPedido(db.Model):
    __tablename__ = "item_pedido"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey("pedido.id"), nullable=False)
    livro_id = db.Column(db.Integer, db.ForeignKey("livro.id"), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    preco_unitario = db.Column(db.Numeric(10, 2), nullable=False)

    livro = db.relationship("Livro", foreign_keys=[livro_id])
