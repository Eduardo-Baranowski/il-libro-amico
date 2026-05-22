from functools import wraps
import os
from decimal import Decimal, InvalidOperation

import requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from .. import db
from ..models.request import Request
from ..models.livro import Livro
from ..services.book_lookup import download_cover_to_uploads, search_books
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
                "leitor_nome": r.leitor.nome if r.leitor else f"Leitor #{r.leitor_id}",
                "livro_id": r.livro_id,
                "livro_titulo": r.livro.titulo if r.livro else None,
                "livro_autor": r.livro.autor if r.livro else None,
                "livro_imagem_url": image_url(r.livro.imagem) if r.livro else None,
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


@editor_bp.route("/books/lookup", methods=["GET"])
@jwt_required()
@verificar_editor
def lookup_books():
    """
    Buscar metadados de livros na Open Library
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    parameters:
      - name: q
        in: query
        type: string
        required: true
        description: Termo de busca (mínimo 2 caracteres)
      - name: limit
        in: query
        type: integer
        required: false
        default: 8
    responses:
      200:
        description: Lista de sugestões (fonte open_library)
      400:
        description: Termo de busca muito curto
      503:
        description: Serviço de busca indisponível
    """
    q = (request.args.get("q") or "").strip()
    limit = request.args.get("limit", 8, type=int)

    if len(q) < 2:
        return jsonify({"message": "Informe ao menos 2 caracteres para buscar.", "items": []}), 400

    try:
        items = search_books(q, limit=limit)
    except requests.RequestException:
        return jsonify({"message": "Serviço de busca temporariamente indisponível.", "items": []}), 503

    return jsonify({"items": items, "fonte": "open_library"}), 200


@editor_bp.route("/books", methods=["GET"])
@jwt_required()
@verificar_editor
def list_books():
    """
    Listar livros da editora com busca e paginação (Apenas Editor)
    ---
    tags:
      - Editor
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        required: false
        default: 1
      - name: per_page
        in: query
        type: integer
        required: false
        default: 10
      - name: q
        in: query
        type: string
        required: false
      - name: genero
        in: query
        type: string
        required: false
    responses:
      200:
        description: Lista paginada de livros da editora
      403:
        description: Acesso negado
    """
    editor_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    q = request.args.get('q', '')
    genero = request.args.get('genero', '')

    query = Livro.query.filter_by(editor_id=editor_id)
    
    if q:
        query = query.filter(
            db.or_(
                Livro.titulo.ilike(f"%{q}%"),
                Livro.autor.ilike(f"%{q}%")
            )
        )
    
    if genero:
        query = query.filter_by(genero=genero)

    pagination = query.order_by(Livro.data_cadastro.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "items": [
            {
                "id": b.id,
                "titulo": b.titulo,
                "autor": b.autor,
                "genero": b.genero,
                "preco": str(b.preco),
                "estoque": b.estoque,
                "descricao": b.descricao,
                "imagem": b.imagem,
                "imagem_url": image_url(b.imagem),
                "data_cadastro": b.data_cadastro.isoformat()
            } for b in pagination.items
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200


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
    estoque = request.form.get("estoque", 0, type=int)
    genero = request.form.get("genero", "")
    descricao = request.form.get("descricao")

    if estoque < 0:
        return jsonify({"message": "estoque deve ser maior ou igual a zero"}), 400

    if not titulo or not autor or preco is None:
        return jsonify({"message": "Título, autor e preço válido são obrigatórios"}), 400

    imagem_path = None
    if "imagem" in request.files and request.files["imagem"].filename:
        imagem_path = save_image(request.files["imagem"], "books")
    elif request.form.get("open_library_cover_id"):
        try:
            cover_id = int(request.form.get("open_library_cover_id"))
            imagem_path = download_cover_to_uploads(
                cover_id, current_app.config["UPLOAD_FOLDER"]
            )
        except (TypeError, ValueError):
            pass

    novo_livro = Livro(
        editor_id=editor_id,
        titulo=titulo,
        autor=autor,
        preco=preco,
        estoque=estoque,
        genero=genero,
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
    if "estoque" in request.form:
        livro.estoque = request.form.get("estoque", type=int)
    if "genero" in request.form:
        livro.genero = request.form.get("genero")
    if "preco" in request.form:
        preco = _parse_preco(request.form.get("preco"))
        if preco is None:
            return jsonify({"message": "preço inválido"}), 400
        livro.preco = preco
    if "descricao" in request.form:
        livro.descricao = request.form.get("descricao")
    if "estoque" in request.form:
        try:
            estoque = int(request.form.get("estoque"))
        except (TypeError, ValueError):
            return jsonify({"message": "estoque inválido"}), 400
        if estoque < 0:
            return jsonify({"message": "estoque deve ser maior ou igual a zero"}), 400
        livro.estoque = estoque
        
    if "imagem" in request.files and request.files["imagem"].filename:
        if livro.imagem:
            old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], livro.imagem)
            if os.path.exists(old_path):
                os.remove(old_path)
        livro.imagem = save_image(request.files["imagem"], "books")
    elif request.form.get("open_library_cover_id"):
        try:
            cover_id = int(request.form.get("open_library_cover_id"))
            new_path = download_cover_to_uploads(
                cover_id, current_app.config["UPLOAD_FOLDER"]
            )
            if new_path:
                if livro.imagem:
                    old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], livro.imagem)
                    if os.path.exists(old_path):
                        os.remove(old_path)
                livro.imagem = new_path
        except (TypeError, ValueError):
            pass

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
    Remover um livro do catálogo de vendas (estoque zerado)
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
    responses:
      200:
        description: Livro removido do catálogo (estoque zerado)
      404:
        description: Livro não encontrado
      403:
        description: Acesso negado
    """
    editor_id = int(get_jwt_identity())
    livro = Livro.query.filter_by(id=id, editor_id=editor_id).first()
    
    if not livro:
        return jsonify({"message": "Livro não encontrado"}), 404

    livro.estoque = 0
    db.session.commit()
    
    return jsonify({"message": "Livro removido do catálogo de vendas (estoque zerado)"}), 200
