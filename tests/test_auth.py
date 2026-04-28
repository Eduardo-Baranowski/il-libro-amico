from app.models.user import User


def test_register_reader_success(client, app_ctx):
    resp = client.post(
        "/auth/register",
        json={"nome": "Novo Leitor", "email": "novo.reader@test.local", "senha": "segura-123"},
    )

    assert resp.status_code == 201
    assert resp.get_json()["message"] == "Leitor cadastrado com sucesso"
    saved = User.query.filter_by(email="novo.reader@test.local").first()
    assert saved is not None
    assert saved.papel == "leitor"


def test_register_rejects_duplicate_email(client):
    payload = {"nome": "Leitor A", "email": "dup@test.local", "senha": "segura-123"}
    assert client.post("/auth/register", json=payload).status_code == 201

    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 400
    assert resp.get_json()["message"] == "Email já cadastrado"


def test_login_success_returns_token_and_role(client, reader_user):
    resp = client.post(
        "/auth/login",
        json={"email": reader_user.email, "senha": "senha-reader"},
    )

    body = resp.get_json()
    assert resp.status_code == 200
    assert body["papel"] == "leitor"
    assert isinstance(body["token_sessao"], str)
    assert body["token_sessao"]


def test_login_invalid_password_returns_401(client, reader_user):
    resp = client.post(
        "/auth/login",
        json={"email": reader_user.email, "senha": "senha-errada"},
    )

    assert resp.status_code == 401
    assert resp.get_json()["message"] == "Credenciais inválidas"
