# Sistema de Gerenciamento de Livros (API REST)

Esta é uma API REST desenvolvida com **Flask**, utilizando **SQLAlchemy** para persistência de dados, **Flask-JWT-Extended** para autenticação via tokens JWT e **Flasgger** para documentação Swagger.

## Pré-requisitos

- Python 3.10+
- `venv` recomendado
- PostgreSQL ou SQLite

## Configuração

1. Crie e ative um ambiente virtual:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure o arquivo `.env` (use `.env.example` como base).

## Banco de Dados

```bash
flask db upgrade
```

Se você adicionou novas tabelas/models (ex.: `Leitura`), aplique as migrations:

```bash
flask db upgrade
```

## Execução

```bash
python run.py
```

A documentação interativa da API (Swagger) estará disponível em: `http://127.0.0.1:5000/apidocs/`

## Frontend (React + TypeScript)

O frontend está em `frontend/` (Vite + React + TypeScript) e já está integrado com a API via proxy em desenvolvimento.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- Em dev, o frontend chama `VITE_API_BASE_URL=/api` e o Vite encaminha para o Flask.
- URL do frontend: `http://127.0.0.1:5173`

## Perfis e Funcionalidades

### Autenticação (`/auth`)
- `POST /auth/register`: Registro de novos leitores.
- `POST /auth/login`: Login para obter o token JWT.

### Leitor / Público (`/reader`)
- `GET /reader/editors`: Listar editoras (público).
- `GET /reader/books`: Listagem de todos os livros.
- `GET /reader/books/<id>`: Detalhes de um livro específico.
- `POST /reader/requests`: Criar uma solicitação para uma editora (requer login).
- `GET /reader/requests`: Listar minhas solicitações (requer login).

### Editora (`/editor`)
- `GET /editor/books`: Listar livros da própria editora.
- `POST /editor/books`: Cadastrar novo livro (com upload de imagem).
- `PUT /editor/books/<id>`: Atualizar livro existente.
- `DELETE /editor/books/<id>`: Remover livro.
- `GET /editor/requests`: Listar solicitações recebidas.
- `PUT /editor/requests/<id>/respond`: Responder a uma solicitação.

### Admin (`/admin`)
- `GET /admin/users`: Listar todos os usuários.
- `POST /admin/users`: Criar novos usuários (qualquer papel).
- `GET /admin/reports`: Visualizar relatórios e estatísticas do sistema.

## Testes

Para rodar os testes de integração:
```bash
python test_api.py
```
*(Certifique-se de que o servidor está rodando)*

Para build do frontend:

```bash
cd frontend
npm run build
```
