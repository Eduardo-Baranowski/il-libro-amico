from app.models.request import Request


def test_editor_create_book_success(client, editor_token, auth_header):
    resp = client.post(
        "/editor/books",
        data={
            "titulo": "Livro Editor",
            "autor": "Autor Editor",
            "preco": "40.50",
            "descricao": "Descricao do livro",
        },
        headers=auth_header(editor_token),
    )

    body = resp.get_json()
    assert resp.status_code == 201
    assert body["message"] == "Livro cadastrado com sucesso"
    assert isinstance(body["id"], int)


def test_editor_respond_request_success(client, editor_token, reader_request, auth_header):
    resp = client.put(
        f"/editor/requests/{reader_request.id}/respond",
        json={"resposta": "Solicitacao aprovada"},
        headers=auth_header(editor_token),
    )

    assert resp.status_code == 200
    assert resp.get_json()["message"] == "Solicitação respondida com sucesso"
    updated = Request.query.get(reader_request.id)
    assert updated.status == "respondida"
    assert updated.resposta == "Solicitacao aprovada"


def test_editor_prevents_duplicate_response(client, editor_token, reader_request, auth_header):
    first = client.put(
        f"/editor/requests/{reader_request.id}/respond",
        json={"resposta": "Primeira"},
        headers=auth_header(editor_token),
    )
    assert first.status_code == 200

    second = client.put(
        f"/editor/requests/{reader_request.id}/respond",
        json={"resposta": "Segunda"},
        headers=auth_header(editor_token),
    )
    assert second.status_code == 400
    assert second.get_json()["message"] == "Solicitação já respondida"


def test_editor_cannot_delete_other_editor_book(client, editor_token, editor_book, admin_token, auth_header):
    # Livro do admin (nao pertence ao token editor)
    create_as_admin = client.post(
        "/admin/users",
        json={"nome": "Editor B", "email": "editorb@test.local", "senha": "senha-editor-b", "papel": "editor"},
        headers=auth_header(admin_token),
    )
    assert create_as_admin.status_code == 201
    editor_b_id = create_as_admin.get_json()["id"]

    # Cria livro como editor logado para nao perder cobertura do endpoint e manter setup simples.
    # Em seguida muda ownership direto no banco para simular livro de outra editora.
    created = client.post(
        "/editor/books",
        data={"titulo": "Livro B", "autor": "Autor B", "preco": "10.00"},
        headers=auth_header(editor_token),
    )
    assert created.status_code == 201

    from app import db
    from app.models.livro import Livro

    book = Livro.query.get(created.get_json()["id"])
    book.editor_id = editor_b_id
    db.session.commit()

    resp = client.delete(f"/editor/books/{book.id}", headers=auth_header(editor_token))
    assert resp.status_code == 404
    assert resp.get_json()["message"] == "Livro não encontrado"


def test_editor_delete_book_removes_image_with_mock(client, editor_token, editor_book, auth_header, mocker):
    editor_book.imagem = "books/temp-image.jpg"
    from app import db

    db.session.commit()
    mocked_remove = mocker.patch("app.controllers.editor.os.remove")
    mocker.patch("app.controllers.editor.os.path.exists", return_value=True)

    resp = client.delete(f"/editor/books/{editor_book.id}", headers=auth_header(editor_token))

    assert resp.status_code == 200
    mocked_remove.assert_called_once()
