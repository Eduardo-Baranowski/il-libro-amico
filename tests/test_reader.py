from app import db
from app.models.leitura import Leitura
from app.models.request import Request


def test_reader_create_request_success(client, reader_token, editor_user, editor_book, auth_header):
    resp = client.post(
        "/reader/requests",
        json={
            "editor_id": editor_user.id,
            "livro_id": editor_book.id,
            "conteudo": "Gostaria de acesso ao catalogo",
        },
        headers=auth_header(reader_token),
    )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["message"] == "Solicitação enviada"
    assert isinstance(body["id"], int)


def test_reader_create_reading_success(client, reader_token, editor_book, auth_header):
    resp = client.post(
        "/reader/readings",
        json={"livro_id": editor_book.id, "status": "lendo", "nota": 4, "comentario": "Bom livro"},
        headers=auth_header(reader_token),
    )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["message"] == "Leitura registrada"
    leitura = Leitura.query.get(body["id"])
    assert leitura is not None
    assert leitura.status == "lendo"
    assert leitura.nota == 4


def test_reader_create_reading_rejects_invalid_nota(client, reader_token, editor_book, auth_header):
    resp = client.post(
        "/reader/readings",
        json={"livro_id": editor_book.id, "status": "lendo", "nota": 8},
        headers=auth_header(reader_token),
    )

    assert resp.status_code == 400
    assert resp.get_json()["message"] == "nota deve ser entre 1 e 5"


def test_reader_routes_forbid_non_reader(client, editor_token, editor_user, auth_header):
    resp = client.post(
        "/reader/requests",
        json={"editor_id": editor_user.id, "livro_id": 1, "conteudo": "teste"},
        headers=auth_header(editor_token),
    )
    assert resp.status_code == 403
    assert resp.get_json()["message"] == "Acesso Negado"


def test_reader_list_my_requests_only_own(client, reader_token, reader_request, auth_header):
    # Cria uma solicitacao de outro leitor para garantir isolamento
    other_req = Request(
        leitor_id=reader_request.editor_id,
        editor_id=reader_request.editor_id,
        conteudo="Nao deveria aparecer",
        status="pendente",
    )
    db.session.add(other_req)
    db.session.commit()

    resp = client.get("/reader/requests", headers=auth_header(reader_token))
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.get_json()]
    assert reader_request.id in ids


def test_reader_list_editor_books_success(client, editor_user, editor_book):
    resp = client.get(f"/reader/editors/{editor_user.id}/books")
    assert resp.status_code == 200
    books = resp.get_json()
    assert any(item["id"] == editor_book.id for item in books)


def test_reader_purchase_success(client, reader_token, editor_book, auth_header):
    editor_book.estoque = 5
    db.session.commit()
    resp = client.post(
        "/reader/purchases",
        json={"livro_id": editor_book.id, "quantidade": 2},
        headers=auth_header(reader_token),
    )
    assert resp.status_code == 201
    assert resp.get_json()["message"] == "Compra realizada com sucesso"
    assert editor_book.estoque == 3


def test_reader_purchase_rejects_insufficient_stock(client, reader_token, editor_book, auth_header):
    editor_book.estoque = 0
    db.session.commit()
    resp = client.post(
        "/reader/purchases",
        json={"livro_id": editor_book.id, "quantidade": 1},
        headers=auth_header(reader_token),
    )
    assert resp.status_code == 400
    assert resp.get_json()["message"] == "Estoque insuficiente"
