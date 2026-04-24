# Sistema de cadastro, leitura e vendas de livros

Aplicação **Flask** monolítica (MVC) com **Jinja2 + Bootstrap**, **Flask-Login** (sessões na interface web) e **API JSON com JWT** para integrações. Base de dados **PostgreSQL** (ou SQLite) via **SQLAlchemy** e **Flask-Migrate**.

## Pré-requisitos

- Python 3.10+ (testado com 3.12 / 3.14)
- `venv` recomendado
- PostgreSQL (caso opte pelo banco de dados em produção/docker)

## Configuração

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edite .env: 
# DATABASE_URI (Postgres: postgresql+psycopg://user:pass@localhost:5432/dbname)
# SECRET_KEY, JWT_SECRET_KEY (≥32 caracteres), ADMIN_*
```

## Banco de Dados e Migrações

O projeto utiliza **Flask-Migrate** (Alembic) para gerir o esquema do banco de dados.

### Inicialização (Primeira vez)
Se a pasta `migrations/` não existir ou se quiser recriar o banco:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### Atualização do Esquema
Sempre que houver alterações nos modelos (`app/models/`):
```bash
flask db migrate -m "Descrição da alteração"
flask db upgrade
```

## Executar em desenvolvimento

```bash
python run.py
```

- Interface web: `http://127.0.0.1:5000/`
- O administrador inicial é criado automaticamente no arranque baseado nas variáveis `ADMIN_INITIAL_EMAIL` e `ADMIN_INITIAL_PASSWORD` do `.env`.
- Uploads: Imagens de perfil e capas de livros são guardadas em `app/static/uploads/`.

## Docker

```bash
docker compose up -d
```
O Docker Compose já sobe o banco **PostgreSQL** e a aplicação **Flask** configurados.

## Testes

```bash
pytest
```

Testes de integração leves em `tests/`. Para a API HTTP com `requests` (servidor a correr):

```bash
python run.py   # terminal 1
python test_api.py   # terminal 2
```

## Perfis

| Perfil   | Web | API JWT |
|----------|-----|---------|
| Leitor   | Registo em `/cadastro`, painel e solicitações | `/auth/register`, `/reader/...` |
| Editora  | Painel, respostas e catálogo de livros | `/editor/...` |
| Admin    | Utilizadores, relatórios | `/admin/...` |

## Estrutura

- `app/controllers/` — blueprints REST (`auth`, `admin`, `reader`, `editor`) e interface (`site`)
- `app/models/` — `User`, `Request` (solicitações), `Livro`
- `app/templates/` — HTML + Bootstrap 5 (CDN)
- `app/static/` — estáticos
- `app/utils.py` — helpers (ex.: `papel_requerido`)
- `run.py` — aplicação WSGI (`gunicorn run:app`)
- `Dockerfile`, `docker-compose.yml`

## Documentação de requisitos

- `Descricao_Projeto_Livros.docx` — descrição oficial do stack e papéis
- `03-especs.md.pdf` — ficheiro de especificações adicional (conteúdo pode ser gráfico; o DOCX foi usado como referência principal)
