import os
from pathlib import Path

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flasgger import Swagger
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    CORS(app)

    os.makedirs(app.instance_path, exist_ok=True)
    
    # Configurações de Upload
    app.config["UPLOAD_FOLDER"] = os.path.join(app.root_path, "static", "uploads")
    app.config["ALLOWED_EXTENSIONS"] = {"png", "jpg", "jpeg", "gif"}
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # Limite de 5MB
    
    os.makedirs(os.path.join(app.config["UPLOAD_FOLDER"], "users"), exist_ok=True)
    os.makedirs(os.path.join(app.config["UPLOAD_FOLDER"], "books"), exist_ok=True)

    db_uri = os.environ.get("DATABASE_URI")
    if not db_uri:
        _db_file = Path(app.instance_path) / "database.db"
        db_uri = f"sqlite:///{_db_file.as_posix()}"
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", os.environ.get("JWT_SECRET_KEY", "dev-only-change-me-use-env")
    )
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", app.config["SECRET_KEY"])

    # Configuração do Swagger
    app.config['SWAGGER'] = {
        'title': 'API de Gerenciamento de Livros',
        'uiversion': 3,
        'specs_route': '/apidocs/',
        'static_url_path': '/flasgger_static',
        'swagger_ui': True,
        'specs': [
            {
                'endpoint': 'apispec_1',
                'route': '/apispec_1.json',
                'rule_filter': lambda rule: True,  # all in
                'model_filter': lambda tag: True,  # all in
            }
        ],
        'headers': [],
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': 'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"'
            }
        }
    }
    Swagger(app)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    from .controllers.auth import auth_bp
    from .controllers.admin import admin_bp
    from .controllers.reader import reader_bp
    from .controllers.editor import editor_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(reader_bp, url_prefix="/reader")
    app.register_blueprint(editor_bp, url_prefix="/editor")

    from .models.user import User  # noqa: F401
    from .models.livro import Livro  # noqa: F401
    from .models.request import Request  # noqa: F401
    from .models.leitura import Leitura  # noqa: F401

    @app.errorhandler(403)
    def _forbidden(_e):
        return jsonify({"message": "Acesso negado"}), 403

    @app.errorhandler(404)
    def _not_found(_e):
        return jsonify({"message": "Recurso não encontrado"}), 404

    return app
