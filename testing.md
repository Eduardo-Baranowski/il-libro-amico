# Plano de Testes (TDD First)

## 1. Objetivo

Definir uma estrategia de testes automatizados com abordagem **TDD First** para validar as funcionalidades criticas do sistema de gerenciamento de livros (API Flask), reduzindo risco de regressao e garantindo evolucao segura.

Este plano esta alinhado a `doc/03-specs.md` (versao 1.2).

## 2. Escopo de Teste

- API REST backend em `app/controllers/*.py`
- Regras de negocio dos modelos `User`, `Livro`, `Request`, `Leitura`, `Compra`, `Pedido`
- Autenticacao JWT e autorizacao por papel
- Refinamentos v1.1: `genero`, recomendacoes paginadas, remocao logica de catalogo (`estoque = 0`)
- Persistencia em banco SQLite isolado por teste (fixtures pytest)

Incluido neste plano (v1.2):

- Testes de componentes e integracao leve da API no frontend (Vitest + Testing Library)
- Cenarios de loading, erro, vazio e retry (`QueryStatus`, `api`)

Fora de escopo neste plano:

- Testes E2E com browser real (Playwright/Cypress) — roadmap futuro
- Testes de regressao visual automatizados (Chromatic/Percy)
- Testes de carga/performance
- Testes de infraestrutura (Docker, deploy)

## 3. Estrategia TDD First

Para cada funcionalidade:

1. **Red**: escrever primeiro o teste de comportamento esperado (incluindo status HTTP e payload).
2. **Green**: implementar/ajustar codigo minimo para passar.
3. **Refactor**: limpar duplicacao e melhorar legibilidade sem alterar comportamento.
4. **Regression gate**: executar suite completa para garantir que alteracoes nao quebraram contratos anteriores.

## 4. Arquitetura da Suite de Testes

```text
tests/
  conftest.py
  test_auth.py
  test_reader.py
  test_editor.py
  test_admin.py
  test_security.py
```

Praticas:

- Uso de `client` (Flask test client) e banco efemero por teste.
- Fixtures: `admin_token`, `editor_token`, `reader_token`, `editor_book`, `reader_request`
- Assert de contrato HTTP: codigo, chave `message`, campos obrigatorios e estrutura paginada quando aplicavel.

## 5. Plano de Casos Criticos por Funcionalidade

### 5.1 Autenticacao (`/auth`)

1. **Registro de leitor** — `POST /auth/register` → `201`, papel `leitor`.
2. **Login** — credenciais validas → `200`, `token_sessao`, `papel`.
3. **Erro de credenciais** — senha invalida → `401`.

### 5.2 Leitor (`/reader`)

1. **Criar solicitacao** — `POST /reader/requests` com `editor_id` + `livro_id` → `201`.
2. **Registrar leitura** — `POST /reader/readings` com `status` valido → `201`.
3. **Validacao de nota** — `nota` fora de `1..5` → `400`.
4. **Acesso negado por papel** — token editor/admin em rota exclusiva de leitor → `403`.
5. **Listar solicitacoes proprias (paginado)** — `GET /reader/requests` retorna `{ items, total, page, pages }`; apenas solicitacoes do leitor autenticado.
6. **Compra com estoque** — baixa de `estoque`; estoque zero → `400`.
7. **Recomendacoes paginadas (v1.1)** — `GET /reader/recommendations` retorna `items` com `average_rating`; ordenacao por media de notas.
8. **Filtro por genero (v1.1)** — `GET /reader/books?genero=Romance` retorna apenas livros do genero informado.

### 5.3 Editora (`/editor`)

1. **Cadastrar livro** — `POST /editor/books` → `201`, associado ao `editor_id` do token; aceita `genero`.
2. **Responder solicitacao** — `PUT /editor/requests/<id>/respond` → `200`, status `respondida`.
3. **Impedir resposta duplicada** — segunda resposta → `400`.
4. **Isolamento entre editoras** — alterar/excluir livro alheio → `404`.
5. **Remocao logica de catalogo (v1.1)** — `DELETE /editor/books/<id>` zera `estoque`, mantem registro; mensagem de estoque zerado.
6. **Listagem com busca e genero (v1.1)** — `GET /editor/books?q=&genero=` retorna estrutura paginada filtrada.

### 5.4 Admin (`/admin`)

1. **Criar usuario com papel** — `POST /admin/users` → `201`.
2. **Papel invalido** — fora de `admin|editor|leitor` → `400`.
3. **Relatorios** — `GET /admin/reports` com agregacoes coerentes.
4. **Acesso negado** — nao-admin em `/admin/*` → `403`.

## 6. Uso de Mocks

Mocks apenas para dependencias externas nao deterministas:

- `app.utils.save_image` em testes de upload (quando necessario).
- Evitar mock de remocao de arquivo em `DELETE` de livro: comportamento atual e remocao logica (sem `os.remove`).

Preferencia: testes de API como integracao leve; `pytest-mock` disponivel em `requirements.txt` para casos pontuais.

## 7. Fixtures (`tests/conftest.py`)

- Usuarios e tokens por papel
- `editor_book`, `reader_request`
- Helper `auth_header(token)` → `Authorization: Bearer ...`

## 8. Frontend — suite Vitest (`frontend/`)

Estrutura:

```text
frontend/src/
  app/components/ui/*.test.tsx
  lib/api.test.ts
  test/setup.ts
```

### 8.1 Componentes de estado

| Caso | Arquivo | Assert |
|------|---------|--------|
| Loading | `QueryStatus.test.tsx` | Nao renderiza children; `aria-busy` |
| Erro + retry | `ErrorState.test.tsx` | `role="alert"`; botao chama `onRetry` |
| Vazio | `EmptyState.test.tsx` | Titulo, descricao, link CTA |
| Render condicional | `QueryStatus.test.tsx` | Children so apos sucesso |

### 8.2 Integracao API (mock fetch)

| Caso | Assert |
|------|--------|
| Resposta 200 | JSON parseado |
| Resposta 4xx | `ApiError` com `message` do backend |

### 8.3 Acessibilidade (testes unitarios)

- `EmptyState`: `role="status"`
- `ErrorState`: `role="alert"`
- `LoadingState`: `aria-live="polite"`

### 8.4 Responsividade e E2E

- **Responsivo:** validacao manual + inspecao de classes CSS (`explore-grid-responsive`, `responsive-book-row`) em review.
- **E2E:** nao automatizado nesta versao; roteiro manual em `doc/03-specs.md` secao 13.

### 8.5 Comandos

```bash
cd frontend
npm install
npm run test:run
npm run build
npm run lint
```

## 9. Pipeline de Execucao (completo)

```bash
# Backend
source .venv/bin/activate
pip install -r requirements.txt
pytest -q

# Frontend
cd frontend && npm install && npm run test:run && npm run build
```

Politica minima:

- PR bloqueado se qualquer teste falhar.
- Cobertura meta evolutiva: **80%** em `app/controllers`.
- Toda correcao de bug inclui teste de regressao.

## 10. Ordem de Implementacao TDD (roadmap)

1. `test_security.py` — autorizacao por papel.
2. `test_auth.py` — registro e login.
3. `test_reader.py` — solicitacoes, leituras, compras, recomendacoes, genero.
4. `test_editor.py` — livros, respostas, remocao logica.
5. `test_admin.py` — usuarios e relatorios.

## 11. Dependencias de Teste

**Backend** (`requirements.txt`):

- `pytest>=8.0.0`
- `pytest-cov>=5.0.0`
- `pytest-mock>=3.14.0`

**Frontend** (`frontend/package.json`):

- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
