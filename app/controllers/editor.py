from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from .. import db
from ..models.request import Request

editor_bp = Blueprint("editor", __name__)


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
