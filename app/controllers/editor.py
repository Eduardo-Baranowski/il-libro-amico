from functools import wraps
import os
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from .. import db
from ..models.request import Request
from ..models.livro import Livro
from ..utils import save_image, image_url

editor_bp = Blueprint("editor", __name__)

def _parse_preco(value: str | None):
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    # Aceita "40,11" e "40.11"
    raw = raw.replace(",", ".")
    try:
        preco = Decimal(raw)
    except (InvalidOperation, ValueError):
        return None
    if preco < 0:
        return None
    return preco


def verificar_editor(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_jwt().get("papel") != "editor":
            return jsonify({"message": "Acesso Negado"}), 403
        return f(*args, **kwargs)

    return decorated_function


@editor_bp.route("/requests", methods=["GET"])
@jwt_required()
@verificar_editor
def list_editor_requests():
    """
    Listar solicitações recebidas (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de solicitações
      403:
        description: Acesso negado
    """
    editor_id = int(get_jwt_identity())
    rows = Request.query.filter_by(editor_id=editor_id).order_by(Request.data_criacao.desc()).all()
    return jsonify(
        [
            {
                "id": r.id,
                "leitor_id": r.leitor_id,
                "conteudo": r.conteudo,
                "resposta": r.resposta,
                "status": r.status,
                "data_criacao": r.data_criacao.isoformat() if r.data_criacao else None,
            }
            for r in rows
        ]
    ), 200


@editor_bp.route("/requests/<int:id>/respond", methods=["PUT"])
@jwt_required()
@verificar_editor
def respond_request(id):
    """
    Responder a uma solicitação (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            resposta:
              type: string
    responses:
      200:
        description: Resposta enviada com sucesso
      400:
        description: Dados inválidos
      404:
        description: Solicitação não encontrada
    """
    editor_id = int(get_jwt_identity())
    data = request.get_json() or {}
    resposta = data.get("resposta")

    if not resposta or not str(resposta).strip():
        return jsonify({"message": "resposta é obrigatória"}), 400

    solicitacao = Request.query.filter_by(id=id, editor_id=editor_id).first()

    if not solicitacao:
        return jsonify({"message": "Solicitação não encontrada para esta editora"}), 404

    if solicitacao.status == "respondida":
        return jsonify({"message": "Solicitação já respondida"}), 400

    solicitacao.resposta = resposta
    solicitacao.status = "respondida"

    db.session.commit()

    return jsonify({"message": "Solicitação respondida com sucesso"}), 200


@editor_bp.route("/books", methods=["GET"])
@jwt_required()
@verificar_editor
def list_books():
    """
    Listar livros da editora (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de livros
    """
    editor_id = int(get_jwt_identity())
    books = Livro.query.filter_by(editor_id=editor_id).all()
    return jsonify([
        {
            "id": b.id,
            "titulo": b.titulo,
            "autor": b.autor,
            "preco": str(b.preco),
            "descricao": b.descricao,
            "imagem": b.imagem,
            "imagem_url": image_url(b.imagem),
            "data_cadastro": b.data_cadastro.isoformat()
        } for b in books
    ]), 200


@editor_bp.route("/books", methods=["POST"])
@jwt_required()
@verificar_editor
def create_book():
    """
    Cadastrar um novo livro (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    parameters:
      - name: titulo
        in: formData
        type: string
        required: true
      - name: autor
        in: formData
        type: string
        required: true
      - name: preco
        in: formData
        type: number
        required: true
      - name: descricao
        in: formData
        type: string
      - name: imagem
        in: formData
        type: file
    responses:
      201:
        description: Livro cadastrado com sucesso
    """
    editor_id = int(get_jwt_identity())
    
    titulo = request.form.get("titulo")
    autor = request.form.get("autor")
    preco = _parse_preco(request.form.get("preco"))
    descricao = request.form.get("descricao")
    
    if not titulo or not autor or not preco:
        return jsonify({"message": "Título, autor e preço válido são obrigatórios"}), 400

    imagem_path = None
    if "imagem" in request.files:
        imagem_path = save_image(request.files["imagem"], "books")

    novo_livro = Livro(
        editor_id=editor_id,
        titulo=titulo,
        autor=autor,
        preco=preco,
        descricao=descricao,
        imagem=imagem_path
    )
    
    db.session.add(novo_livro)
    try:
        db.session.commit()
    except Exception as e:
        from sqlalchemy.exc import DataError, IntegrityError

        db.session.rollback()
        if isinstance(e, (DataError, IntegrityError)):
            return jsonify({"message": "Dados inválidos"}), 400
        raise
    
    return jsonify({"message": "Livro cadastrado com sucesso", "id": novo_livro.id}), 201


@editor_bp.route("/books/<int:id>", methods=["PUT"])
@jwt_required()
@verificar_editor
def update_book(id):
    """
    Atualizar um livro (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
      - name: titulo
        in: formData
        type: string
      - name: autor
        in: formData
        type: string
      - name: preco
        in: formData
        type: number
      - name: descricao
        in: formData
        type: string
      - name: imagem
        in: formData
        type: file
    responses:
      200:
        description: Livro atualizado com sucesso
    """
    editor_id = int(get_jwt_identity())
    livro = Livro.query.filter_by(id=id, editor_id=editor_id).first()
    
    if not livro:
        return jsonify({"message": "Livro não encontrado"}), 404

    if "titulo" in request.form:
        livro.titulo = request.form.get("titulo")
    if "autor" in request.form:
        livro.autor = request.form.get("autor")
    if "preco" in request.form:
        preco = _parse_preco(request.form.get("preco"))
        if preco is None:
            return jsonify({"message": "preço inválido"}), 400
        livro.preco = preco
    if "descricao" in request.form:
        livro.descricao = request.form.get("descricao")
        
    if "imagem" in request.files:
        # Remover imagem antiga se existir
        if livro.imagem:
            old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], livro.imagem)
            if os.path.exists(old_path):
                os.remove(old_path)
        
        livro.imagem = save_image(request.files["imagem"], "books")

    try:
        db.session.commit()
    except Exception as e:
        from sqlalchemy.exc import DataError, IntegrityError

        db.session.rollback()
        if isinstance(e, (DataError, IntegrityError)):
            return jsonify({"message": "Dados inválidos"}), 400
        raise
    return jsonify({"message": "Livro atualizado com sucesso"}), 200


@editor_bp.route("/books/<int:id>", methods=["DELETE"])
@jwt_required()
@verificar_editor
def delete_book(id):
    """
    Remover um livro (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    responses:
      200:
        description: Livro removido com sucesso
    """
    editor_id = int(get_jwt_identity())
    livro = Livro.query.filter_by(id=id, editor_id=editor_id).first()
    
    if not livro:
        return jsonify({"message": "Livro não encontrado"}), 404

    if livro.imagem:
        image_path = os.path.join(current_app.config["UPLOAD_FOLDER"], livro.imagem)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.session.delete(livro)
    db.session.commit()
    
    return jsonify({"message": "Livro removido com sucesso"}), 200
