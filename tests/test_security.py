def test_admin_route_requires_auth(client):
    resp = client.get("/admin/users")
    assert resp.status_code == 401


def test_admin_route_forbids_non_admin(client, reader_token, auth_header):
    resp = client.get("/admin/users", headers=auth_header(reader_token))
    assert resp.status_code == 403
    assert resp.get_json()["message"] == "Acesso Negado"


def test_editor_route_forbids_reader(client, reader_token, auth_header):
    resp = client.get("/editor/books", headers=auth_header(reader_token))
    assert resp.status_code == 403
    assert resp.get_json()["message"] == "Acesso Negado"


def test_reader_route_forbids_editor(client, editor_token, auth_header):
    resp = client.get("/reader/requests", headers=auth_header(editor_token))
    assert resp.status_code == 403
    assert resp.get_json()["message"] == "Acesso Negado"


def _order_payload(livro_id: int, quantidade: int = 1):
    return {
        "items": [{"livro_id": livro_id, "quantidade": quantidade}],
        "rua": "Rua Teste",
        "numero": "1",
        "cep": "00000-000",
    }


def test_create_order_rejects_negative_quantity(client, reader_token, editor_book, auth_header):
    editor_book.estoque = 10
    from app import db

    db.session.commit()
    estoque_antes = editor_book.estoque

    resp = client.post(
        "/reader/orders",
        headers=auth_header(reader_token),
        json=_order_payload(editor_book.id, quantidade=-5),
    )
    assert resp.status_code == 400
    assert "quantidade" in resp.get_json()["message"].lower()

    db.session.refresh(editor_book)
    assert editor_book.estoque == estoque_antes


def test_create_order_rejects_zero_quantity(client, reader_token, editor_book, auth_header):
    resp = client.post(
        "/reader/orders",
        headers=auth_header(reader_token),
        json=_order_payload(editor_book.id, quantidade=0),
    )
    assert resp.status_code == 400
    assert resp.get_json()["message"] == "quantidade deve ser maior que zero"


def test_editor_cannot_create_order(client, editor_token, editor_book, auth_header):
    resp = client.post(
        "/reader/orders",
        headers=auth_header(editor_token),
        json=_order_payload(editor_book.id),
    )
    assert resp.status_code == 403
    assert resp.get_json()["message"] == "Acesso Negado"
