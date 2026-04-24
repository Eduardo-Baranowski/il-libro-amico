from flask import Blueprint, request, jsonify
from ..models.user import User
from ..models.request import Request
from .. import db
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

reader_bp = Blueprint('reader', __name__)

def verificar_leitor(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_jwt().get("papel") != "leitor":
            return jsonify({"message": "Acesso Negado"}), 403
        return f(*args, **kwargs)
    return decorated_function

@reader_bp.route('/requests', methods=['POST'])
@jwt_required()
@verificar_leitor
def create_request():
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
