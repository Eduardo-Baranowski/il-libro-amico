def test_admin_create_user_success(client, admin_token, auth_header):
    resp = client.post(
        "/admin/users",
        json={
            "nome": "Novo Editor",
            "email": "novo.editor@test.local",
            "senha": "segura-123",
            "papel": "editor",
        },
        headers=auth_header(admin_token),
    )

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["message"] == "Usuário criado com sucesso"
    assert isinstance(body["id"], int)


def test_admin_create_user_invalid_role(client, admin_token, auth_header):
    resp = client.post(
        "/admin/users",
        json={
            "nome": "Invalido",
            "email": "invalido@test.local",
            "senha": "segura-123",
            "papel": "superadmin",
        },
        headers=auth_header(admin_token),
    )

    assert resp.status_code == 400
    assert resp.get_json()["message"] == "Papel de usuário inválido"


def test_admin_reports_returns_aggregated_data(client, admin_token, auth_header):
    resp = client.get("/admin/reports", headers=auth_header(admin_token))
    assert resp.status_code == 200

    body = resp.get_json()
    assert "total_usuarios" in body
    assert "total_livros" in body
    assert isinstance(body["usuarios"], dict)
    assert isinstance(body["solicitacoes"], dict)
