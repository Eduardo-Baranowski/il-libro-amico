import os

import pytest

from app import create_app, db, bcrypt
from app.models.livro import Livro
from app.models.request import Request
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


@pytest.fixture
def app_ctx(app):
    with app.app_context():
        yield


def _create_user(nome: str, email: str, senha: str, papel: str) -> User:
    user = User(
        nome=nome,
        email=email,
        senha_hash=bcrypt.generate_password_hash(senha).decode("utf-8"),
        papel=papel,
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def editor_user(app_ctx):
    return _create_user("Editora Teste", "editor@test.local", "senha-editor", "editor")


@pytest.fixture
def reader_user(app_ctx):
    return _create_user("Leitor Teste", "reader@test.local", "senha-reader", "leitor")


@pytest.fixture
def admin_user(app_ctx):
    user = User.query.filter_by(email=os.environ["ADMIN_INITIAL_EMAIL"]).first()
    assert user is not None
    return user


@pytest.fixture
def admin_token(client, admin_user):
    resp = client.post(
        "/auth/login",
        json={"email": admin_user.email, "senha": os.environ["ADMIN_INITIAL_PASSWORD"]},
    )
    assert resp.status_code == 200
    return resp.get_json()["token_sessao"]


@pytest.fixture
def editor_token(client, editor_user):
    resp = client.post(
        "/auth/login",
        json={"email": editor_user.email, "senha": "senha-editor"},
    )
    assert resp.status_code == 200
    return resp.get_json()["token_sessao"]


@pytest.fixture
def reader_token(client, reader_user):
    resp = client.post(
        "/auth/login",
        json={"email": reader_user.email, "senha": "senha-reader"},
    )
    assert resp.status_code == 200
    return resp.get_json()["token_sessao"]


@pytest.fixture
def auth_header():
    def _factory(token: str):
        return {"Authorization": f"Bearer {token}"}

    return _factory


@pytest.fixture
def editor_book(app_ctx, editor_user):
    book = Livro(
        editor_id=editor_user.id,
        titulo="Livro Base",
        autor="Autor Base",
        preco="12.90",
        descricao="Descricao base",
    )
    db.session.add(book)
    db.session.commit()
    return book


@pytest.fixture
def reader_request(app_ctx, reader_user, editor_user, editor_book):
    req = Request(
        leitor_id=reader_user.id,
        editor_id=editor_user.id,
        livro_id=editor_book.id,
        conteudo="Solicitacao inicial",
        status="pendente",
    )
    db.session.add(req)
    db.session.commit()
    return req
