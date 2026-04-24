def test_home_redirects_anonymous(client):
    r = client.get("/")
    assert r.status_code == 200


def test_cadastro_leitor(client):
    r = client.post(
        "/cadastro",
        data={
            "nome": "Leitor Teste",
            "email": "leitor@test.local",
            "senha": "senha123",
        },
        follow_redirects=True,
    )
    assert r.status_code == 200
    assert b"painel" in r.data.lower() or "Minhas solicita" in r.get_data(as_text=True)


def test_admin_login_e_criar_editora(client):
    r = client.post(
        "/entrar",
        data={"email": "admin@test.local", "senha": "senha-teste-32-chars-minimo!!"},
        follow_redirects=True,
    )
    assert r.status_code == 200
    r = client.post(
        "/painel-admin/usuarios/novo",
        data={
            "nome": "Editora Teste",
            "email": "editor@test.local",
            "senha": "senha123",
            "papel": "editor",
        },
        follow_redirects=True,
    )
    assert r.status_code == 200


def test_jwt_login_apos_fluxo(client):
    """API JWT continua funcional."""
    r = client.post(
        "/auth/login",
        json={"email": "admin@test.local", "senha": "senha-teste-32-chars-minimo!!"},
    )
    assert r.status_code == 200
    body = r.get_json()
    assert "token_sessao" in body
    assert body.get("papel") == "admin"
