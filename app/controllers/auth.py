from flask import Blueprint, request, jsonify
from ..models.user import User
from .. import db, bcrypt
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    nome = data.get('nome')
    email = data.get('email')
    senha = data.get('senha')

    if not nome or not email or not senha:
        return jsonify({"message": "Campos nome, email e senha são obrigatórios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já cadastrado"}), 400
    
    senha_hash = bcrypt.generate_password_hash(senha).decode('utf-8')
    novo_usuario = User(nome=nome, email=email, senha_hash=senha_hash, papel='leitor')
    
    db.session.add(novo_usuario)
    db.session.commit()
    
    return jsonify({"message": "Leitor cadastrado com sucesso"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    senha = data.get('senha')

    if not email or not senha:
        return jsonify({"message": "Email e senha são obrigatórios"}), 400
    
    usuario = User.query.filter_by(email=email).first()
    
    if usuario and usuario.verificar_senha(senha):
        # PyJWT exige que "sub" (identity) seja string; papel vai em additional_claims.
        token_sessao = create_access_token(
            identity=str(usuario.id),
            additional_claims={"papel": usuario.papel},
        )
        return jsonify({"token_sessao": token_sessao, "papel": usuario.papel}), 200
    
    return jsonify({"message": "Credenciais inválidas"}), 401
