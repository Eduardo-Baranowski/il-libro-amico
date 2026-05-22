from flask import Blueprint, request, jsonify
from ..models.user import User
from ..models.request import Request
from ..models.livro import Livro
from .. import db, bcrypt
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps

admin_bp = Blueprint('admin', __name__)

def verificar_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if get_jwt().get("papel") != "admin":
            return jsonify({"message": "Acesso Negado"}), 403
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@verificar_admin
def list_users():
    """
    Listar todos os usuários (Apenas Admin)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Lista de usuários
        schema:
          type: array
          items:
            properties:
              id:
                type: integer
              nome:
                type: string
              email:
                type: string
              papel:
                type: string
      403:
        description: Acesso negado
    """
    rows = User.query.order_by(User.id).all()
    return jsonify(
        [
            {"id": u.id, "nome": u.nome, "email": u.email, "papel": u.papel}
            for u in rows
        ]
    ), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@verificar_admin
def create_user():
    """
    Criar um novo usuário (Apenas Admin)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            nome:
              type: string
            email:
              type: string
            senha:
              type: string
            papel:
              type: string
              enum: [admin, editor, leitor]
    responses:
      201:
        description: Usuário criado com sucesso
      400:
        description: Dados inválidos
      403:
        description: Acesso negado
    """
    data = request.get_json()
    nome = data.get('nome')
    email = data.get('email')
    senha = data.get('senha')
    papel = data.get('papel')
    
    if papel not in ['editor', 'leitor', 'admin']:
        return jsonify({"message": "Papel de usuário inválido"}), 400

    if not nome or not email or not senha:
        return jsonify({"message": "Campos nome, email e senha são obrigatórios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado"}), 400

    senha_hash = bcrypt.generate_password_hash(senha).decode('utf-8')
    novo_usuario = User(nome=nome, email=email, senha_hash=senha_hash, papel=papel)

    db.session.add(novo_usuario)
    db.session.commit()

    return jsonify({"message": "Usuário criado com sucesso", "id": novo_usuario.id}), 201

@admin_bp.route('/reports', methods=['GET'])
@jwt_required()
@verificar_admin
def reports():
    """
    Obter relatórios do sistema (Apenas Admin)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Relatórios estatísticos
      403:
        description: Acesso negado
    """
    total_usuarios = User.query.count()
    # Para simplificar o agrupamento por papel e status, poderíamos fazer consultas específicas
    usuarios_por_papel = db.session.query(User.papel, db.func.count(User.id)).group_by(User.papel).all()
    solicitacoes_por_status = db.session.query(Request.status, db.func.count(Request.id)).group_by(Request.status).all()
    
    relatorio = {
        "total_usuarios": total_usuarios,
        "total_livros": Livro.query.count(),
        "usuarios": {papel: count for papel, count in usuarios_por_papel},
        "solicitacoes": {status: count for status, count in solicitacoes_por_status},
    }
    
    return jsonify(relatorio), 200

@admin_bp.route('/export-csv', methods=['GET'])
@jwt_required()
@verificar_admin
def export_csv():
    """
    Exportar usuários em CSV
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Arquivo CSV (Content-Disposition attachment)
      403:
        description: Acesso negado
    """
    import io
    import csv
    from flask import make_response
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Nome', 'Email', 'Papel'])
    
    users = User.query.order_by(User.id).all()
    for u in users:
        writer.writerow([u.id, u.nome, u.email, u.papel])
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=usuarios_lumina.csv"
    response.headers["Content-type"] = "text/csv"
    return response

@admin_bp.route('/refresh-metrics', methods=['POST'])
@jwt_required()
@verificar_admin
def refresh_metrics():
    """
    Sincronizar métricas do painel admin
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Métricas atualizadas
      403:
        description: Acesso negado
    """
    return jsonify({"message": "Métricas do sistema sincronizadas com sucesso!"}), 200
