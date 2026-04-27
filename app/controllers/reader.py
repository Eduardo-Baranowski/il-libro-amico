from flask import Blueprint, request, jsonify
from ..models.user import User
from ..models.request import Request
from ..models.livro import Livro
from ..models.leitura import Leitura
from .. import db
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps
from ..utils import image_url

reader_bp = Blueprint('reader', __name__)

def verificar_leitor(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_jwt().get("papel") != "leitor":
            return jsonify({"message": "Acesso Negado"}), 403
        return f(*args, **kwargs)
    return decorated_function

@reader_bp.route('/editors', methods=['GET'])
def list_editors():
    """
    Listar editoras (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Lista de editoras
    """
    rows = User.query.filter_by(papel="editor").order_by(User.nome).all()
    return jsonify([{"id": u.id, "nome": u.nome} for u in rows]), 200

@reader_bp.route('/books', methods=['GET'])
def list_all_books():
    """
    Listar todos os livros (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Lista de todos os livros
    """
    books = Livro.query.all()
    return jsonify([
        {
            "id": b.id,
            "titulo": b.titulo,
            "autor": b.autor,
            "preco": str(b.preco),
            "descricao": b.descricao,
            "imagem": b.imagem,
            "imagem_url": image_url(b.imagem),
            "editora": b.editor.nome
        } for b in books
    ]), 200

@reader_bp.route('/books/<int:id>', methods=['GET'])
def get_book_details(id):
    """
    Obter detalhes de um livro (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Detalhes do livro
      404:
        description: Livro não encontrado
    """
    b = Livro.query.get_or_404(id)
    return jsonify({
        "id": b.id,
        "titulo": b.titulo,
        "autor": b.autor,
        "preco": str(b.preco),
        "descricao": b.descricao,
        "imagem": b.imagem,
        "imagem_url": image_url(b.imagem),
        "editora": b.editor.nome,
        "data_cadastro": b.data_cadastro.isoformat()
    }), 200


@reader_bp.route("/readings", methods=["POST"])
@jwt_required()
@verificar_leitor
def create_reading():
    """
    Registrar leitura de um livro (Apenas Leitor)
    ---
    tags:
      - Leitor
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            livro_id:
              type: integer
            status:
              type: string
              enum: [quero_ler, lendo, lido]
            nota:
              type: integer
              minimum: 1
              maximum: 5
            comentario:
              type: string
    responses:
      201:
        description: Leitura registrada
    """
    leitor_id = int(get_jwt_identity())
    data = request.get_json() or {}
    livro_id = data.get("livro_id")
    status = (data.get("status") or "lendo").strip()
    nota = data.get("nota")
    comentario = data.get("comentario")

    if not livro_id:
        return jsonify({"message": "livro_id é obrigatório"}), 400
    if status not in ("quero_ler", "lendo", "lido"):
        return jsonify({"message": "status inválido"}), 400
    if nota is not None:
        try:
            nota_int = int(nota)
        except (TypeError, ValueError):
            return jsonify({"message": "nota inválida"}), 400
        if nota_int < 1 or nota_int > 5:
            return jsonify({"message": "nota deve ser entre 1 e 5"}), 400
        nota = nota_int

    livro = Livro.query.get(livro_id)
    if not livro:
        return jsonify({"message": "Livro não encontrado"}), 404

    leitura = Leitura(
        leitor_id=leitor_id,
        livro_id=livro_id,
        status=status,
        nota=nota,
        comentario=comentario,
    )
    db.session.add(leitura)
    db.session.commit()

    return jsonify({"message": "Leitura registrada", "id": leitura.id}), 201


@reader_bp.route("/readings", methods=["GET"])
@jwt_required()
@verificar_leitor
def list_my_readings():
    """
    Listar minhas leituras (Apenas Leitor)
    ---
    tags:
      - Leitor
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de leituras
    """
    leitor_id = int(get_jwt_identity())
    rows = (
        Leitura.query.filter_by(leitor_id=leitor_id)
        .order_by(Leitura.atualizado_em.desc(), Leitura.criado_em.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": r.id,
                "livro": {
                    "id": r.livro.id,
                    "titulo": r.livro.titulo,
                    "autor": r.livro.autor,
                    "descricao": r.livro.descricao,
                    "imagem_url": image_url(r.livro.imagem),
                    "editora": r.livro.editor.nome,
                },
                "status": r.status,
                "nota": r.nota,
                "comentario": r.comentario,
                "criado_em": r.criado_em.isoformat() if r.criado_em else None,
                "atualizado_em": r.atualizado_em.isoformat() if r.atualizado_em else None,
            }
            for r in rows
        ]
    ), 200


@reader_bp.route("/feed", methods=["GET"])
def feed():
    """
    Feed público de leituras (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Feed de leituras
    """
    limit = request.args.get("limit", "30")
    try:
        limit = max(1, min(100, int(limit)))
    except ValueError:
        limit = 30

    rows = Leitura.query.order_by(Leitura.criado_em.desc()).limit(limit).all()
    return jsonify(
        [
            {
                "id": r.id,
                "leitor": {
                    "id": r.leitor.id,
                    "nome": r.leitor.nome,
                    "imagem_url": image_url(r.leitor.imagem),
                },
                "livro": {
                    "id": r.livro.id,
                    "titulo": r.livro.titulo,
                    "autor": r.livro.autor,
                    "imagem_url": image_url(r.livro.imagem),
                },
                "status": r.status,
                "nota": r.nota,
                "comentario": r.comentario,
                "criado_em": r.criado_em.isoformat() if r.criado_em else None,
            }
            for r in rows
        ]
    ), 200

@reader_bp.route('/requests', methods=['POST'])
@jwt_required()
@verificar_leitor
def create_request():
    """
    Criar uma nova solicitação (Apenas Leitor)
    ---
    tags:
      - Leitor
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            editor_id:
              type: integer
            conteudo:
              type: string
    responses:
      201:
        description: Solicitação enviada com sucesso
      400:
        description: Dados inválidos
      404:
        description: Editora não encontrada
    """
    leitor_id = int(get_jwt_identity())
    data = request.get_json() or {}
    editor_id = data.get('editor_id')
    conteudo = data.get('conteudo')

    if editor_id is None or not conteudo or not str(conteudo).strip():
        return jsonify({"message": "editor_id e conteudo são obrigatórios"}), 400

    editor = User.query.filter_by(id=editor_id, papel='editor').first()
    if not editor:
        return jsonify({"message": "Editora não encontrada"}), 404

    nova_solicitacao = Request(
        leitor_id=leitor_id,
        editor_id=editor_id,
        conteudo=conteudo,
        status='pendente'
    )

    db.session.add(nova_solicitacao)
    db.session.commit()

    return jsonify({"message": "Solicitação enviada", "id": nova_solicitacao.id}), 201

@reader_bp.route('/requests', methods=['GET'])
@jwt_required()
@verificar_leitor
def get_my_requests():
    """
    Listar minhas solicitações (Apenas Leitor)
    ---
    tags:
      - Leitor
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de solicitações
      403:
        description: Acesso negado
    """
    leitor_id = int(get_jwt_identity())
    minhas_solicitacoes = Request.query.filter_by(leitor_id=leitor_id).all()
    
    resultado = []
    for s in minhas_solicitacoes:
        resultado.append({
            "id": s.id,
            "editor_id": s.editor_id,
            "conteudo": s.conteudo,
            "resposta": s.resposta,
            "status": s.status,
            "data_criacao": s.data_criacao.isoformat()
        })
    
    return jsonify(resultado), 200
