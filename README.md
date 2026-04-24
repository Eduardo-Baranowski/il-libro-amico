# Sistema de cadastro, leitura e vendas de livros

Aplicação **Flask** monolítica (MVC) com **Jinja2 + Bootstrap**, **Flask-Login** (sessões na interface web) e **API JSON com JWT** para integrações. Base de dados **SQLite** via **SQLAlchemy**, conforme a descrição do projeto (`Descricao_Projeto_Livros.docx`).

## Pré-requisitos

- Python 3.10+ (testado com 3.12 / 3.14)
- `venv` recomendado

## Configuração

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edite .env: SECRET_KEY, JWT_SECRET_KEY (≥32 caracteres), ADMIN_*
```

## Executar em desenvolvimento

```bash
python run.py
```

- Interface web: `http://127.0.0.1:5000/`
- Ao importar `run`, as tabelas são criadas e o administrador inicial é semeado (Gunicorn incluído).
- SQLite por omissão: `instance/database.db` (pasta `instance/` criada automaticamente).

Variáveis úteis: `FLASK_DEBUG` (1 ou 0), `PORT` (omissão 5000), `DATABASE_URI` (opcional).

## Docker

```bash
docker compose build
docker compose up
```

O volume `./instance` mantém a base de dados entre reinícios.

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
