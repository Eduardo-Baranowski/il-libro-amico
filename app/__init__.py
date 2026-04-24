import os
from pathlib import Path

from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_login import LoginManager

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
login_manager = LoginManager()


@login_manager.user_loader
def load_user(user_id):
    from .models.user import User

    return db.session.get(User, int(user_id))


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    os.makedirs(app.instance_path, exist_ok=True)

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

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "site.entrar"

    from .controllers.auth import auth_bp
    from .controllers.admin import admin_bp
    from .controllers.reader import reader_bp
    from .controllers.editor import editor_bp
    from .controllers.site import site_bp

    app.register_blueprint(site_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(reader_bp, url_prefix="/reader")
    app.register_blueprint(editor_bp, url_prefix="/editor")

    from .models import livro as _livro  # noqa: F401 — registo de modelo

    @app.errorhandler(403)
    def _forbidden(_e):
        return render_template("errors/403.html"), 403

    return app
