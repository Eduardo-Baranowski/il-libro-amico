import os

import pytest

from app import create_app, db, bcrypt
from app.models.user import User


@pytest.fixture
def app(tmp_path):
    db_path = tmp_path / "test.db"
    os.environ["DATABASE_URI"] = f"sqlite:///{db_path.as_posix()}"
    os.environ["ADMIN_INITIAL_EMAIL"] = "admin@test.local"
    os.environ["ADMIN_INITIAL_PASSWORD"] = "senha-teste-32-chars-minimo!!"
    os.environ["JWT_SECRET_KEY"] = "x" * 32
    os.environ["SECRET_KEY"] = "y" * 32

    application = create_app()
    with application.app_context():
        db.create_all()
        if not User.query.filter_by(email=os.environ["ADMIN_INITIAL_EMAIL"]).first():
            db.session.add(
                User(
                    nome="Admin Teste",
                    email=os.environ["ADMIN_INITIAL_EMAIL"],
                    senha_hash=bcrypt.generate_password_hash(
                        os.environ["ADMIN_INITIAL_PASSWORD"]
                    ).decode("utf-8"),
                    papel="admin",
                )
            )
            db.session.commit()

    yield application


@pytest.fixture
def client(app):
    return app.test_client()
