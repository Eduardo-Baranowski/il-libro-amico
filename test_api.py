import requests

BASE_URL = "http://127.0.0.1:5000"

def test_flow():
    print("--- Iniciando testes da API ---")
    
    # 1. Login como Admin
    print("\n1. Login como Admin...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@example.com",
        "senha": "admin123"
    })
    assert resp.status_code == 200
    admin_token = resp.json()['token_sessao']
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Sucesso!")

    # 2. Criar uma Editora via Admin
    print("\n2. Criando Editora...")
    resp = requests.post(f"{BASE_URL}/admin/users", headers=admin_headers, json={
        "nome": "Editora A",
        "email": "editora@example.com",
        "senha": "password123",
        "papel": "editor"
    })
    assert resp.status_code == 201
    editor_id = resp.json()["id"]
    print("Sucesso! editor_id=", editor_id)

    # 3. Registrar um Leitor
    print("\n3. Registrando Leitor...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "nome": "Leitor Um",
        "email": "leitor@example.com",
        "senha": "password123"
    })
    assert resp.status_code == 201
    print("Sucesso!")

    # 4. Login como Leitor
    print("\n4. Login como Leitor...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "leitor@example.com",
        "senha": "password123"
    })
    assert resp.status_code == 200
    leitor_token = resp.json()['token_sessao']
    leitor_headers = {"Authorization": f"Bearer {leitor_token}"}
    print("Sucesso!")

    # 5. Leitor cria uma solicitação para a Editora
    print(f"\n5. Leitor cria solicitação para Editora ID {editor_id}...")
    resp = requests.post(f"{BASE_URL}/reader/requests", headers=leitor_headers, json={
        "editor_id": editor_id,
        "conteudo": "Gostaria de solicitar a revisão do meu manuscrito."
    })
    assert resp.status_code == 201
    solicitacao_id = resp.json()["id"]
    print("Sucesso! solicitacao_id=", solicitacao_id)

    # 6. Login como Editora
    print("\n6. Login como Editora...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "editora@example.com",
        "senha": "password123"
    })
    assert resp.status_code == 200
    editor_token = resp.json()['token_sessao']
    editor_headers = {"Authorization": f"Bearer {editor_token}"}
    print("Sucesso!")

    # 7. Editora responde à solicitação
    print(f"\n7. Editora responde à solicitação ID {solicitacao_id}...")
    resp = requests.put(f"{BASE_URL}/editor/requests/{solicitacao_id}/respond", headers=editor_headers, json={
        "resposta": "Recebido. Iniciaremos a revisão em breve."
    })
    assert resp.status_code == 200
    print("Sucesso!")

    # 8. Admin verifica relatórios
    print("\n8. Admin verifica relatórios...")
    resp = requests.get(f"{BASE_URL}/admin/reports", headers=admin_headers)
    assert resp.status_code == 200
    print("Relatório:", resp.json())
    print("Sucesso!")

    print("\n--- Todos os testes passaram! ---")

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Erro nos testes: {e}")
