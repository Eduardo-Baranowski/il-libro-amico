from app import db
from app.models.message import Message
from app.models.user import User
from app import bcrypt


def _reader(client, suffix: str) -> tuple[User, str]:
    email = f"reader-{suffix}@test.local"
    user = User(
        nome=f"Leitor {suffix}",
        email=email,
        senha_hash=bcrypt.generate_password_hash("senha-reader").decode("utf-8"),
        papel="leitor",
    )
    db.session.add(user)
    db.session.commit()
    resp = client.post("/auth/login", json={"email": email, "senha": "senha-reader"})
    assert resp.status_code == 200
    return user, resp.get_json()["token_sessao"]


def test_messages_after_id_returns_only_new(client, app_ctx, auth_header):
    user_a, token_a = _reader(client, "a")
    user_b, token_b = _reader(client, "b")

    first = client.post(
        f"/reader/users/{user_b.id}/messages",
        headers=auth_header(token_a),
        json={"conteudo": "Primeira"},
    )
    assert first.status_code == 201
    first_id = first.get_json()["id"]

    second = client.post(
        f"/reader/users/{user_b.id}/messages",
        headers=auth_header(token_a),
        json={"conteudo": "Segunda"},
    )
    assert second.status_code == 201

    full = client.get(
        f"/reader/users/{user_a.id}/messages",
        headers=auth_header(token_b),
    )
    assert full.status_code == 200
    assert len(full.get_json()) == 2

    delta = client.get(
        f"/reader/users/{user_a.id}/messages?after_id={first_id}",
        headers=auth_header(token_b),
    )
    assert delta.status_code == 200
    body = delta.get_json()
    assert len(body) == 1
    assert body[0]["conteudo"] == "Segunda"
    assert body[0]["id"] > first_id


def test_send_message_persists(client, app_ctx, auth_header):
    user_a, token_a = _reader(client, "send-a")
    user_b, _token_b = _reader(client, "send-b")

    resp = client.post(
        f"/reader/users/{user_b.id}/messages",
        headers=auth_header(token_a),
        json={"conteudo": "Olá"},
    )
    assert resp.status_code == 201
    msg_id = resp.get_json()["id"]

    saved = db.session.get(Message, msg_id)
    assert saved is not None
    assert saved.conteudo == "Olá"
    assert saved.sender_id == user_a.id
    assert saved.receiver_id == user_b.id


def test_reader_events_requires_auth(client):
    resp = client.get("/reader/events")
    assert resp.status_code == 401


def test_reader_events_stream_content_type(client, app_ctx, auth_header):
    _, token = _reader(client, "sse")
    resp = client.get("/reader/events", headers=auth_header(token))
    assert resp.status_code == 200
    assert "text/event-stream" in (resp.content_type or "")
