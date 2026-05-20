from flask import Blueprint, request, jsonify, current_app
from ..models.user import User
from ..models.request import Request
from ..models.livro import Livro
from ..models.leitura import Leitura
from ..models.compra import Compra
from ..models.follow import Follow
from ..models.friendship import Friendship
from ..models.message import Message
from ..models.pedido import Pedido, ItemPedido
from .. import db, bcrypt
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps
import os
from ..utils import image_url, save_image
from datetime import datetime, timezone
from decimal import Decimal

reader_bp = Blueprint('reader', __name__)

def verificar_leitor(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_jwt().get("papel") != "leitor":
            return jsonify({"message": "Acesso Negado"}), 403
        return f(*args, **kwargs)
    return decorated_function


def _parse_positive_int(value, field_name: str = "quantidade"):
    """Retorna (int, None) ou (None, mensagem_de_erro)."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None, f"{field_name} inválida"
    if n <= 0:
        return None, f"{field_name} deve ser maior que zero"
    return n, None

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


@reader_bp.route('/users/<int:user_id>', methods=['GET'])
def get_public_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(
        {
            "id": user.id,
            "nome": user.nome,
            "papel": user.papel,
            "imagem_url": image_url(user.imagem),
        }
    ), 200


@reader_bp.route('/users/<int:user_id>/visit', methods=['GET'])
def get_public_user_visit(user_id):
    user = User.query.get_or_404(user_id)
    is_editor = user.papel == "editor"

    editor_books = (
        Livro.query.filter_by(editor_id=user.id).order_by(Livro.data_cadastro.desc()).limit(4).all()
        if is_editor
        else []
    )
    reading_log = (
        Leitura.query.filter_by(leitor_id=user.id).order_by(Leitura.criado_em.desc()).limit(5).all()
        if user.papel == "leitor"
        else []
    )

    total_publications = Livro.query.filter_by(editor_id=user.id).count() if is_editor else 0
    total_readings = Leitura.query.filter_by(leitor_id=user.id).count()
    total_requests = Request.query.filter_by(leitor_id=user.id).count()
    total_purchases = Compra.query.filter_by(leitor_id=user.id).count()
    followers_count = Follow.query.filter_by(following_id=user.id).count()
    following_count = Follow.query.filter_by(follower_id=user.id).count()
    friends_count = Friendship.query.filter(
        Friendship.status == "accepted",
        db.or_(Friendship.requester_id == user.id, Friendship.addressee_id == user.id),
    ).count()

    timeline_dates = []
    first_book = Livro.query.filter_by(editor_id=user.id).order_by(Livro.data_cadastro.asc()).first() if is_editor else None
    if first_book and first_book.data_cadastro:
        timeline_dates.append(first_book.data_cadastro)
    first_reading = Leitura.query.filter_by(leitor_id=user.id).order_by(Leitura.criado_em.asc()).first()
    if first_reading and first_reading.criado_em:
        timeline_dates.append(first_reading.criado_em)
    first_request = Request.query.filter_by(leitor_id=user.id).order_by(Request.data_criacao.asc()).first()
    if first_request and first_request.data_criacao:
        timeline_dates.append(first_request.data_criacao)
    first_purchase = Compra.query.filter_by(leitor_id=user.id).order_by(Compra.data_compra.asc()).first()
    if first_purchase and first_purchase.data_compra:
        timeline_dates.append(first_purchase.data_compra)

    if timeline_dates:
        now = datetime.now(timezone.utc)
        oldest = min(timeline_dates)
        if oldest.tzinfo is None:
            oldest = oldest.replace(tzinfo=timezone.utc)
        else:
            oldest = oldest.astimezone(timezone.utc)
        tenure_years = max(1, int((now - oldest).days / 365))
    else:
        tenure_years = 1

    stats = {
        "publications": total_publications,
        "citations": total_readings + total_requests + total_purchases,
        "tenure": f"{tenure_years}y",
        "contributions": total_publications + total_readings + total_requests + total_purchases,
        "followers": followers_count,
        "following": following_count,
        "friends": friends_count,
    }

    return jsonify(
        {
            "user": {
                "id": user.id,
                "nome": user.nome,
                "papel": user.papel,
                "imagem_url": image_url(user.imagem),
                "headline": user.headline or ("Senior Scholar" if is_editor else "Leitor da comunidade"),
                "bio": user.bio or ("Dedicated to scholarly rigor." if is_editor else "Active reader."),
            },
            "stats": stats,
            "featured": [
                {
                    "id": b.id,
                    "titulo": b.titulo,
                    "autor": b.autor,
                    "imagem_url": image_url(b.imagem),
                    "descricao": b.descricao,
                    "data": b.data_cadastro.isoformat() if b.data_cadastro else None,
                    "tipo": "publication",
                }
                for b in editor_books
            ],
            "reading_log": [
                {
                    "id": r.id,
                    "livro_id": r.livro_id,
                    "titulo": r.livro.titulo,
                    "autor": r.livro.autor,
                    "status": r.status,
                    "nota": r.nota,
                    "imagem_url": image_url(r.livro.imagem),
                    "criado_em": r.criado_em.isoformat() if r.criado_em else None,
                }
                for r in reading_log
            ],
            "specializations": (
                ["Linguística", "Semiótica", "Filologia Digital", "Curadoria de Arquivos"]
                if is_editor
                else ["Leitura", "Resenhas", "Curadoria Comunitária"]
            ),
            "affiliations": (
                [
                    {"nome": "Instituto de Pesquisa Semântica", "cargo": "Investigador Líder"},
                    {"nome": "Conselho de Arquivos Digitais", "cargo": "Membro do Conselho Consultivo"},
                ]
                if is_editor
                else [{"nome": "Círculo de Leitores Lumina", "cargo": "Membro Ativo"}]
            ),
        }
    ), 200


@reader_bp.route('/users/<int:user_id>/relation', methods=['GET'])
@jwt_required()
def relation_status(user_id):
    current_id = int(get_jwt_identity())
    if current_id == user_id:
        return jsonify({"following": False, "is_friend": False, "outgoing_pending": False, "incoming_pending": False}), 200

    following = Follow.query.filter_by(follower_id=current_id, following_id=user_id).first() is not None
    outgoing_pending = (
        Friendship.query.filter_by(requester_id=current_id, addressee_id=user_id, status="pending").first() is not None
    )
    incoming_pending = (
        Friendship.query.filter_by(requester_id=user_id, addressee_id=current_id, status="pending").first() is not None
    )
    is_friend = (
        Friendship.query.filter(
            Friendship.status == "accepted",
            db.or_(
                db.and_(Friendship.requester_id == current_id, Friendship.addressee_id == user_id),
                db.and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_id),
            ),
        ).first()
        is not None
    )
    return jsonify(
        {
            "following": following,
            "is_friend": is_friend,
            "outgoing_pending": outgoing_pending,
            "incoming_pending": incoming_pending,
        }
    ), 200


@reader_bp.route('/users/<int:user_id>/follow', methods=['POST'])
@jwt_required()
def follow_user(user_id):
    current_id = int(get_jwt_identity())
    if current_id == user_id:
        return jsonify({"message": "Operação inválida"}), 400
    target = User.query.get(user_id)
    if not target:
        return jsonify({"message": "Usuário não encontrado"}), 404
    exists = Follow.query.filter_by(follower_id=current_id, following_id=user_id).first()
    if exists:
        return jsonify({"message": "Você já segue este perfil"}), 200
    db.session.add(Follow(follower_id=current_id, following_id=user_id))
    db.session.commit()
    return jsonify({"message": "Seguindo perfil"}), 201


@reader_bp.route('/users/<int:user_id>/follow', methods=['DELETE'])
@jwt_required()
def unfollow_user(user_id):
    current_id = int(get_jwt_identity())
    row = Follow.query.filter_by(follower_id=current_id, following_id=user_id).first()
    if not row:
        return jsonify({"message": "Você não segue este perfil"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Você deixou de seguir"}), 200


@reader_bp.route('/users/<int:user_id>/connect', methods=['POST'])
@jwt_required()
def connect_user(user_id):
    current_id = int(get_jwt_identity())
    if current_id == user_id:
        return jsonify({"message": "Operação inválida"}), 400
    target = User.query.get(user_id)
    if not target:
        return jsonify({"message": "Usuário não encontrado"}), 404

    existing_friend = Friendship.query.filter(
        Friendship.status == "accepted",
        db.or_(
            db.and_(Friendship.requester_id == current_id, Friendship.addressee_id == user_id),
            db.and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_id),
        ),
    ).first()
    if existing_friend:
        return jsonify({"message": "Conexão já existe"}), 200

    incoming = Friendship.query.filter_by(requester_id=user_id, addressee_id=current_id, status="pending").first()
    if incoming:
        incoming.status = "accepted"
        db.session.commit()
        return jsonify({"message": "Conexão aceita"}), 200

    outgoing = Friendship.query.filter_by(requester_id=current_id, addressee_id=user_id, status="pending").first()
    if outgoing:
        return jsonify({"message": "Convite já enviado"}), 200

    db.session.add(Friendship(requester_id=current_id, addressee_id=user_id, status="pending"))
    db.session.commit()
    return jsonify({"message": "Convite de conexão enviado"}), 201


@reader_bp.route('/users/<int:user_id>/connect', methods=['DELETE'])
@jwt_required()
def disconnect_user(user_id):
    current_id = int(get_jwt_identity())
    row = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.requester_id == current_id, Friendship.addressee_id == user_id),
            db.and_(Friendship.requester_id == user_id, Friendship.addressee_id == current_id),
        )
    ).first()
    if not row:
        return jsonify({"message": "Sem conexão ativa"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Conexão removida"}), 200


@reader_bp.route('/friendships/<int:friendship_id>/accept', methods=['POST'])
@jwt_required()
def accept_friendship(friendship_id):
    current_id = int(get_jwt_identity())
    row = Friendship.query.filter_by(id=friendship_id, addressee_id=current_id, status="pending").first()
    if not row:
        return jsonify({"message": "Solicitação não encontrada"}), 404
    row.status = "accepted"
    db.session.commit()
    return jsonify({"message": "Solicitação aceita"}), 200


@reader_bp.route('/friendships/<int:friendship_id>/reject', methods=['POST'])
@jwt_required()
def reject_friendship(friendship_id):
    current_id = int(get_jwt_identity())
    row = Friendship.query.filter_by(id=friendship_id, addressee_id=current_id, status="pending").first()
    if not row:
        return jsonify({"message": "Solicitação não encontrada"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Solicitação recusada"}), 200


@reader_bp.route('/notifications', methods=['GET'])
@jwt_required()
def notifications():
    current_id = int(get_jwt_identity())
    friend_requests = (
        Friendship.query.filter_by(addressee_id=current_id, status="pending")
        .order_by(Friendship.criado_em.desc())
        .limit(20)
        .all()
    )
    unread_rows = (
        Message.query.filter_by(receiver_id=current_id, lida=False)
        .order_by(Message.data_envio.desc())
        .all()
    )
    unread_by_sender = {}
    for msg in unread_rows:
        key = msg.sender_id
        if key not in unread_by_sender:
            unread_by_sender[key] = {"count": 0, "latest": msg}
        unread_by_sender[key]["count"] += 1

    unread_messages = []
    for sender_id, payload in unread_by_sender.items():
        sender = User.query.get(sender_id)
        if not sender:
            continue
        latest = payload["latest"]
        unread_messages.append(
            {
                "sender_id": sender.id,
                "sender_nome": sender.nome,
                "sender_imagem_url": image_url(sender.imagem),
                "count": payload["count"],
                "latest_conteudo": latest.conteudo,
                "latest_data_envio": latest.data_envio.isoformat() if latest.data_envio else None,
            }
        )

    requester_ids = {fr.requester_id for fr in friend_requests}
    requester_map = {u.id: u for u in User.query.filter(User.id.in_(requester_ids)).all()} if requester_ids else {}

    return jsonify(
        {
            "friend_requests": [
                {
                    "id": fr.id,
                    "requester_id": fr.requester_id,
                    "requester_nome": (requester_map[fr.requester_id].nome if fr.requester_id in requester_map else f"#{fr.requester_id}"),
                    "requester_imagem_url": (
                        image_url(requester_map[fr.requester_id].imagem) if fr.requester_id in requester_map else None
                    ),
                    "criado_em": fr.criado_em.isoformat() if fr.criado_em else None,
                }
                for fr in friend_requests
            ],
            "unread_messages": unread_messages,
            "counts": {
                "friend_requests": len(friend_requests),
                "unread_message_threads": len(unread_messages),
                "unread_messages_total": len(unread_rows),
            },
        }
    ), 200


@reader_bp.route('/users/<int:user_id>/messages', methods=['GET'])
@jwt_required()
def list_messages_with_user(user_id):
    current_id = int(get_jwt_identity())
    _ = User.query.get_or_404(user_id)
    try:
        limit = int(request.args.get("limit", "80"))
    except ValueError:
        limit = 80
    limit = max(10, min(200, limit))
    try:
        after_id = int(request.args.get("after_id", "0"))
    except ValueError:
        after_id = 0

    rows = (
        Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == current_id, Message.receiver_id == user_id),
                db.and_(Message.sender_id == user_id, Message.receiver_id == current_id),
            )
        )
        .filter(Message.id > after_id)
        .order_by(Message.data_envio.asc())
        .limit(limit)
        .all()
    )
    for m in rows:
        if m.receiver_id == current_id and not m.lida:
            m.lida = True
    db.session.commit()
    return jsonify(
        [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "conteudo": m.conteudo,
                "lida": m.lida,
                "data_envio": m.data_envio.isoformat() if m.data_envio else None,
            }
            for m in rows
        ]
    ), 200


@reader_bp.route('/users/<int:user_id>/messages', methods=['POST'])
@jwt_required()
def send_message_to_user(user_id):
    current_id = int(get_jwt_identity())
    if current_id == user_id:
        return jsonify({"message": "Operação inválida"}), 400
    _ = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    conteudo = (data.get("conteudo") or "").strip()
    if not conteudo:
        return jsonify({"message": "conteudo é obrigatório"}), 400
    msg = Message(sender_id=current_id, receiver_id=user_id, conteudo=conteudo)
    db.session.add(msg)
    db.session.commit()
    return jsonify({"message": "Mensagem enviada", "id": msg.id}), 201


@reader_bp.route('/editors/<int:editor_id>/books', methods=['GET'])
def list_editor_books(editor_id):
    """
    Listar livros de uma editora (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Lista de livros da editora
      404:
        description: Editora não encontrada
    """
    editor = User.query.filter_by(id=editor_id, papel='editor').first()
    if not editor:
        return jsonify({"message": "Editora não encontrada"}), 404

    books = Livro.query.filter_by(editor_id=editor_id).order_by(Livro.titulo.asc()).all()
    return jsonify(
        [
            {
                "id": b.id,
                "titulo": b.titulo,
                "autor": b.autor,
                "preco": str(b.preco),
                "estoque": b.estoque,
                "imagem_url": image_url(b.imagem),
            }
            for b in books
        ]
    ), 200

@reader_bp.route('/books', methods=['GET'])
def list_all_books():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    genero = request.args.get('genero', '')

    query = Livro.query
    if genero:
        query = query.filter_by(genero=genero)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    books = pagination.items
    
    return jsonify({
        "items": [
            {
                "id": b.id,
                "titulo": b.titulo,
                "autor": b.autor,
                "genero": b.genero,
                "preco": str(b.preco),
                "estoque": b.estoque,
                "editor_id": b.editor_id,
                "status_estoque": (
                    "esgotado"
                    if b.estoque <= 0
                    else "baixo"
                    if b.estoque <= 3
                    else "disponivel"
                ),
                "descricao": b.descricao,
                "imagem": b.imagem,
                "imagem_url": image_url(b.imagem),
                "editora": b.editor.nome
            } for b in books
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200


@reader_bp.route('/search', methods=['GET'])
def search():
    """
    Busca global por livros, usuários e editoras (Público)
    ---
    tags:
      - Público
    responses:
      200:
        description: Resultado da busca global
    """
    q = (request.args.get("q") or "").strip()
    genero = (request.args.get("genero") or "").strip()
    try:
        limit = int(request.args.get("limit", "8"))
    except ValueError:
        limit = 8
    limit = max(1, min(25, limit))

    if not q and not genero:
        return jsonify({"books": [], "users": [], "editors": []}), 200

    book_query = Livro.query
    if q:
        like = f"%{q}%"
        book_query = book_query.join(User, Livro.editor_id == User.id).filter(
            db.or_(
                Livro.titulo.ilike(like),
                Livro.autor.ilike(like),
                Livro.descricao.ilike(like),
                User.nome.ilike(like),
            )
        )

    if genero:
        book_query = book_query.filter(Livro.genero.ilike(genero))

    books = book_query.order_by(Livro.titulo.asc()).limit(limit).all()

    users: list[User] = []
    editors: list[User] = []
    if q:
        like = f"%{q}%"
        users = (
            User.query.filter(User.nome.ilike(like), User.papel != "editor")
            .order_by(User.nome.asc())
            .limit(limit)
            .all()
        )
        editors = (
            User.query.filter(User.papel == "editor", User.nome.ilike(like))
            .order_by(User.nome.asc())
            .limit(limit)
            .all()
        )

    return jsonify(
        {
            "books": [
                {
                    "id": b.id,
                    "titulo": b.titulo,
                    "autor": b.autor,
                    "genero": b.genero,
                    "preco": str(b.preco),
                    "estoque": b.estoque,
                    "editor_id": b.editor_id,
                    "status_estoque": (
                        "esgotado" if b.estoque <= 0 else "baixo" if b.estoque <= 3 else "disponivel"
                    ),
                    "imagem_url": image_url(b.imagem),
                    "editora": b.editor.nome,
                }
                for b in books
            ],
            "users": [
                {
                    "id": u.id,
                    "nome": u.nome,
                    "papel": u.papel,
                    "imagem_url": image_url(u.imagem),
                }
                for u in users
            ],
            "editors": [
                {
                    "id": e.id,
                    "nome": e.nome,
                    "imagem_url": image_url(e.imagem),
                }
                for e in editors
            ],
        }
    ), 200

@reader_bp.route('/books/<int:id>', methods=['GET'])
@jwt_required(optional=True)
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
    my_reading = None

    try:
        from flask_jwt_extended import verify_jwt_in_request
        # Verify if there is a token, but don't fail if not
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
        
        if current_user_id:
            user = User.query.get(int(current_user_id))
            if user and user.papel == 'leitor':
                r = Leitura.query.filter_by(leitor_id=user.id, livro_id=b.id).first()
                if r:
                    my_reading = {
                        "status": r.status,
                        "nota": r.nota,
                        "comentario": r.comentario
                    }
    except Exception:
        # If JWT verification fails for any reason, we just don't return the reading status
        pass

    return jsonify({
        "id": b.id,
        "titulo": b.titulo,
        "autor": b.autor,
        "preco": str(b.preco),
        "estoque": b.estoque,
        "editor_id": b.editor_id,
        "status_estoque": (
            "esgotado"
            if b.estoque <= 0
            else "baixo"
            if b.estoque <= 3
            else "disponivel"
        ),
        "descricao": b.descricao,
        "imagem": b.imagem,
        "imagem_url": image_url(b.imagem),
        "editora": b.editor.nome,
        "editora_imagem_url": image_url(b.editor.imagem),
        "publicador": {
            "id": b.editor.id,
            "nome": b.editor.nome,
            "papel": b.editor.papel,
            "imagem_url": image_url(b.editor.imagem),
        },
        "data_cadastro": b.data_cadastro.isoformat(),
        "my_reading": my_reading
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

    # Evitar duplicidade: verificar se já existe registro para este livro
    leitura = Leitura.query.filter_by(leitor_id=leitor_id, livro_id=livro_id).first()
    
    if leitura:
        leitura.status = status
        leitura.nota = nota
        leitura.comentario = comentario
        msg = "Leitura atualizada"
        status_code = 200
    else:
        leitura = Leitura(
            leitor_id=leitor_id,
            livro_id=livro_id,
            status=status,
            nota=nota,
            comentario=comentario,
        )
        db.session.add(leitura)
        msg = "Leitura registrada"
        status_code = 201

    db.session.commit()
    return jsonify({"message": msg, "id": leitura.id}), status_code


@reader_bp.route("/readings", methods=["GET"])
@jwt_required()
def list_readings():
    current_user_id = int(get_jwt_identity())
    # Se user_id for passado na query, usa ele (para perfis públicos), caso contrário usa o logado
    target_user_id = request.args.get('user_id', current_user_id, type=int)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = (
        Leitura.query.filter_by(leitor_id=target_user_id)
        .order_by(Leitura.atualizado_em.desc(), Leitura.criado_em.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    rows = pagination.items
    
    return jsonify({
        "items": [
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
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200


@reader_bp.route("/readings/<int:reading_id>", methods=["DELETE"])
@jwt_required()
@verificar_leitor
def delete_reading(reading_id):
    """
    Remover um registro de leitura (Apenas Leitor)
    """
    leitor_id = int(get_jwt_identity())
    leitura = Leitura.query.filter_by(id=reading_id, leitor_id=leitor_id).first()
    
    if not leitura:
        return jsonify({"message": "Registro de leitura não encontrado"}), 404
        
    db.session.delete(leitura)
    db.session.commit()
    
    return jsonify({"message": "Leitura removida com sucesso"}), 200


from sqlalchemy import func

@reader_bp.route('/recommendations', methods=['GET'])
def get_recommendations():
    """
    Obter recomendações de livros baseadas em avaliações com paginação
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 6, type=int)

    # Subquery para média de notas
    avg_ratings = db.session.query(
        Leitura.livro_id,
        func.avg(Leitura.nota).label('average_rating')
    ).filter(Leitura.nota.isnot(None)).group_by(Leitura.livro_id).subquery()

    # Query principal unindo Livro com a média de notas
    query = db.session.query(Livro, func.coalesce(avg_ratings.c.average_rating, 0).label('average_rating'))\
        .outerjoin(avg_ratings, Livro.id == avg_ratings.c.livro_id)\
        .order_by(db.desc('average_rating'), Livro.data_cadastro.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "items": [
            {
                "id": b.Livro.id,
                "titulo": b.Livro.titulo,
                "autor": b.Livro.autor,
                "imagem_url": image_url(b.Livro.imagem),
                "average_rating": float(round(b.average_rating, 1))
            } for b in pagination.items
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200

@reader_bp.route("/feed", methods=["GET"])
def feed():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = Leitura.query.order_by(Leitura.criado_em.desc()).paginate(page=page, per_page=per_page, error_out=False)
    rows = pagination.items
    
    return jsonify({
        "items": [
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
        ],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200

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
    livro_id = data.get('livro_id')
    conteudo = data.get('conteudo')

    if editor_id is None or livro_id is None:
        return jsonify({"message": "editor_id e livro_id são obrigatórios"}), 400

    editor = User.query.filter_by(id=editor_id, papel='editor').first()
    if not editor:
        return jsonify({"message": "Editora não encontrada"}), 404

    livro = Livro.query.filter_by(id=livro_id, editor_id=editor_id).first()
    if not livro:
        return jsonify({"message": "Livro não encontrado para esta editora"}), 404

    msg = (str(conteudo).strip() if conteudo is not None else "")
    if not msg:
        msg = f"Tenho interesse no livro '{livro.titulo}'."

    nova_solicitacao = Request(
        leitor_id=leitor_id,
        editor_id=editor_id,
        livro_id=livro_id,
        conteudo=msg,
        status='pendente'
    )

    db.session.add(nova_solicitacao)
    db.session.commit()

    return jsonify({"message": "Solicitação enviada", "id": nova_solicitacao.id}), 201


@reader_bp.route("/purchases", methods=["POST"])
@jwt_required()
@verificar_leitor
def create_purchase():
    """
    Comprar livro (Apenas Leitor)
    ---
    tags:
      - Leitor
    security:
      - Bearer: []
    responses:
      201:
        description: Compra registrada
    """
    leitor_id = int(get_jwt_identity())
    data = request.get_json() or {}
    livro_id = data.get("livro_id")
    quantidade = data.get("quantidade", 1)

    try:
        quantidade = int(quantidade)
    except (TypeError, ValueError):
        return jsonify({"message": "quantidade inválida"}), 400
    if quantidade <= 0:
        return jsonify({"message": "quantidade deve ser maior que zero"}), 400

    livro = Livro.query.get(livro_id)
    if not livro:
        return jsonify({"message": "Livro não encontrado"}), 404
    if livro.estoque < quantidade:
        return jsonify({"message": "Estoque insuficiente"}), 400

    livro.estoque -= quantidade
    total = livro.preco * quantidade
    compra = Compra(
        leitor_id=leitor_id,
        livro_id=livro.id,
        quantidade=quantidade,
        total=total,
        status="confirmada",
    )
    db.session.add(compra)
    db.session.commit()

    return jsonify({"message": "Compra realizada com sucesso", "id": compra.id}), 201


@reader_bp.route("/purchases", methods=["GET"])
@jwt_required()
@verificar_leitor
def list_my_purchases():
    leitor_id = int(get_jwt_identity())
    rows = Compra.query.filter_by(leitor_id=leitor_id).order_by(Compra.data_compra.desc()).all()
    return jsonify(
        [
            {
                "id": c.id,
                "quantidade": c.quantidade,
                "total": str(c.total),
                "status": c.status,
                "data_compra": c.data_compra.isoformat() if c.data_compra else None,
                "livro": {
                    "id": c.livro.id,
                    "titulo": c.livro.titulo,
                    "autor": c.livro.autor,
                    "imagem_url": image_url(c.livro.imagem),
                    "editora": c.livro.editor.nome,
                },
            }
            for c in rows
        ]
    ), 200

@reader_bp.route('/requests', methods=['GET'])
@jwt_required()
@verificar_leitor
def get_my_requests():
    leitor_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    pagination = Request.query.filter_by(leitor_id=leitor_id).order_by(Request.data_criacao.desc()).paginate(page=page, per_page=per_page, error_out=False)
    minhas_solicitacoes = pagination.items
    
    resultado = []
    for s in minhas_solicitacoes:
        resultado.append({
            "id": s.id,
            "editor_id": s.editor_id,
            "editor_nome": s.editor.nome if s.editor else None,
            "livro_id": s.livro_id,
            "livro_titulo": s.livro.titulo if s.livro else None,
            "livro_autor": s.livro.autor if s.livro else None,
            "livro_imagem_url": image_url(s.livro.imagem) if s.livro else None,
            "conteudo": s.conteudo,
            "resposta": s.resposta,
            "status": s.status,
            "data_criacao": s.data_criacao.isoformat()
        })
    
    return jsonify({
        "items": resultado,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200

@reader_bp.route('/conversations', methods=['GET'])
@jwt_required()
def list_conversations():
    current_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    
    # Busca todos os usuários com quem houve troca de mensagens
    # Primeiro pegamos as conversas únicas (distintas combinações de sender/receiver)
    sent_to = db.session.query(Message.receiver_id).filter_by(sender_id=current_id).distinct()
    received_from = db.session.query(Message.sender_id).filter_by(receiver_id=current_id).distinct()
    
    user_ids = {uid[0] for uid in sent_to.all()} | {uid[0] for uid in received_from.all()}
    
    conversations_raw = []
    for uid in user_ids:
        user = User.query.get(uid)
        if not user: continue
            
        # Pega a última mensagem entre eles
        last_msg = Message.query.filter(
            db.or_(
                db.and_(Message.sender_id == current_id, Message.receiver_id == uid),
                db.and_(Message.sender_id == uid, Message.receiver_id == current_id)
            )
        ).order_by(Message.data_envio.desc()).first()
        
        conversations_raw.append({
            "user_id": user.id,
            "user_nome": user.nome,
            "user_imagem_url": image_url(user.imagem),
            "last_message": last_msg.conteudo if last_msg else "",
            "last_message_time": last_msg.data_envio.isoformat() if last_msg else None,
            "unread_count": Message.query.filter_by(sender_id=uid, receiver_id=current_id, lida=False).count()
        })
        
    # Ordena pelas mais recentes
    conversations_raw.sort(key=lambda x: x['last_message_time'] or "", reverse=True)
    
    # Paginação manual já que user_ids veio de sets e múltiplas queries
    total = len(conversations_raw)
    start = (page - 1) * per_page
    end = start + per_page
    items = conversations_raw[start:end]
    pages = (total + per_page - 1) // per_page
    
    return jsonify({
        "items": items,
        "total": total,
        "page": page,
        "pages": pages
    }), 200

# --- ORDER MANAGEMENT ---

@reader_bp.route('/orders', methods=['POST'])
@jwt_required()
@verificar_leitor
def create_order():
    current_id = int(get_jwt_identity())
    data = request.get_json() or {}

    items_data = data.get('items', [])
    if not items_data:
        return jsonify({"message": "Carrinho vazio"}), 400
        
    try:
        # Criar o pedido base
        novo_pedido = Pedido(
            leitor_id=current_id,
            endereco_rua=data.get('rua'),
            endereco_numero=data.get('numero'),
            endereco_bairro=data.get('bairro'),
            endereco_cidade=data.get('cidade'),
            endereco_estado=data.get('estado'),
            endereco_cep=data.get('cep'),
            metodo_pagamento=data.get('metodo_pagamento', 'simulado'),
            total=Decimal("0.00")
        )
        db.session.add(novo_pedido)
        db.session.flush() # Para pegar o ID do pedido
        
        total_acumulado = Decimal("0.00")
        
        for item in items_data:
            livro_id = item.get("livro_id")
            if livro_id is None:
                db.session.rollback()
                return jsonify({"message": "livro_id é obrigatório em cada item"}), 400

            quantidade, qty_err = _parse_positive_int(item.get("quantidade"))
            if qty_err:
                db.session.rollback()
                return jsonify({"message": qty_err}), 400

            livro = Livro.query.get(livro_id)
            if not livro:
                db.session.rollback()
                return jsonify({"message": f"Livro ID {livro_id} não encontrado"}), 400

            if livro.estoque < quantidade:
                db.session.rollback()
                return jsonify({
                    "message": f"O livro '{livro.titulo}' possui apenas {livro.estoque} unidades em estoque."
                }), 400

            livro.estoque -= quantidade

            preco_unit = livro.preco
            subtotal = preco_unit * quantidade
            total_acumulado += subtotal

            item_obj = ItemPedido(
                pedido_id=novo_pedido.id,
                livro_id=livro.id,
                quantidade=quantidade,
                preco_unitario=preco_unit
            )
            db.session.add(item_obj)
            
        novo_pedido.total = total_acumulado
        db.session.commit()
        
        return jsonify({
            "message": "Pedido realizado com sucesso",
            "pedido_id": novo_pedido.id,
            "total": str(total_acumulado)
        }), 201
        
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Falha ao processar pedido leitor_id=%s", current_id)
        return jsonify({"message": "Erro interno ao processar pedido"}), 500

@reader_bp.route('/orders', methods=['GET'])
@jwt_required()
def list_orders():
    current_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 8, type=int)
    
    pagination = Pedido.query.filter_by(leitor_id=current_id).order_by(Pedido.data_pedido.desc()).paginate(page=page, per_page=per_page, error_out=False)
    pedidos = pagination.items
    
    resultado = []
    for p in pedidos:
        resultado.append({
            "id": p.id,
            "data": p.data_pedido.isoformat(),
            "status": p.status,
            "total": str(p.total),
            "itens": [{
                "titulo": item.livro.titulo,
                "quantidade": item.quantidade,
                "preco_unitario": str(item.preco_unitario),
                "imagem_url": image_url(item.livro.imagem)
            } for item in p.itens]
        })
        
    return jsonify({
        "items": resultado,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    }), 200

# --- PROFILE MANAGEMENT ---

@reader_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_id = int(get_jwt_identity())
    user = User.query.get(current_id)
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
        
    data = request.get_json() or {}
    if 'nome' in data:
        user.nome = data.get('nome')
    if 'headline' in data:
        user.headline = data.get('headline')
    if 'bio' in data:
        user.bio = data.get('bio')
        
    db.session.commit()
    return jsonify({"message": "Perfil atualizado com sucesso"}), 200

@reader_bp.route('/profile/photo', methods=['POST'])
@jwt_required()
def update_profile_photo():
    current_id = int(get_jwt_identity())
    user = User.query.get(current_id)
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
        
    if 'imagem' not in request.files:
        return jsonify({"message": "Nenhum arquivo enviado"}), 400
        
    file = request.files['imagem']
    if user.imagem:
        old_path = os.path.join(current_app.config["UPLOAD_FOLDER"], user.imagem)
        if os.path.exists(old_path):
            os.remove(old_path)
            
    user.imagem = save_image(file, "users")
    db.session.commit()
    return jsonify({"message": "Foto atualizada", "imagem_url": image_url(user.imagem)}), 200

@reader_bp.route('/profile/password', methods=['PUT'])
@jwt_required()
def update_password():
    current_id = int(get_jwt_identity())
    user = User.query.get(current_id)
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
        
    data = request.get_json() or {}
    atual = data.get('senha_atual')
    nova = data.get('nova_senha')
    
    if not atual or not nova:
        return jsonify({"message": "Senhas atual e nova são obrigatórias"}), 400
        
    if not user.verificar_senha(atual):
        return jsonify({"message": "Senha atual incorreta"}), 400
        
    user.senha_hash = bcrypt.generate_password_hash(nova).decode('utf-8')
    db.session.commit()
    return jsonify({"message": "Senha alterada com sucesso"}), 200

@reader_bp.route('/profile', methods=['DELETE'])
@jwt_required()
def delete_account():
    current_id = int(get_jwt_identity())
    user = User.query.get(current_id)
    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
        
    # Limpeza de dados relacionados (opcional dependendo de ON DELETE CASCADE)
    # Por segurança, vamos remover a imagem física
    if user.imagem:
        path = os.path.join(current_app.config["UPLOAD_FOLDER"], user.imagem)
        if os.path.exists(path):
            os.remove(path)
            
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Conta removida permanentemente"}), 200
