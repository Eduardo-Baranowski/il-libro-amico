# Especificação do Sistema de Cadastro, Leitura e Vendas de Livros

**Versão:** 1.2  
**Base:** `Descricao_Projeto_Livros.docx` (v1.0, 2025)  
**Refinamentos:** v1.1 — API (`genero`, recomendações, paginação, remoção lógica); v1.2 — frontend (design system, estados de UI, acessibilidade, testes)

---

## 1. Objetivo

Plataforma web para cadastro de usuários (Administrador, Editora, Leitor), gestão de catálogo de livros, solicitações entre leitores e editoras, registro de leituras com notas, compras com controle de estoque, perfis públicos e interação social (seguir, conexões, mensagens).

---

## 2. Perfis, cadastro e permissões

| Perfil | Cadastro | Permissões principais |
|--------|----------|------------------------|
| **Administrador** | Seed inicial (`.env`) ou criado por outro admin | CRUD de usuários; relatórios; exportação CSV |
| **Editora** | Somente por administrador | CRUD do próprio catálogo; responder solicitações recebidas |
| **Leitor** | Autocadastro público (`POST /auth/register`) | Solicitações, leituras, compras, perfil, rede social |

**Regra:** rotas protegidas exigem JWT; o papel é validado via claim `papel` no token (`admin`, `editor`, `leitor`). O `sub` do JWT é o `id` do usuário (string).

---

## 3. Arquitetura

- **Backend:** Flask monolítico (blueprints por perfil), SQLAlchemy, SQLite (`instance/database.db` ou `DATABASE_URI`).
- **API:** JSON REST sob prefixos `/auth`, `/reader`, `/editor`, `/admin`; documentação Swagger em `/apidocs/`.
- **Frontend:** React + TypeScript (Vite) em `frontend/`, consumindo a API (proxy `/api` em desenvolvimento).
- **Autenticação API:** Flask-JWT-Extended (`token_sessao` no login).
- **Infraestrutura:** Docker / Docker Compose; variáveis sensíveis em `.env` (não versionado).

Estrutura de diretórios conforme o projeto: `app/controllers`, `app/models`, `app/utils.py`, `migrations/`, `tests/`, `run.py`.

---

## 4. Modelos de dados (principais)

### 4.1 `User`
- `id`, `nome`, `email` (único), `senha_hash`, `papel`
- Opcionais: `imagem`, `headline`, `bio`

### 4.2 `Livro`
- `id`, `editor_id` (FK User), `titulo`, `autor`, `preco`, `estoque`, `descricao`, `imagem`, `data_cadastro`
- **`genero`** (String, opcional) — refinamento v1.1: classificação para filtros na loja e no catálogo da editora

### 4.3 `Request` (solicitação leitor → editora)
- `leitor_id`, `editor_id`, `livro_id` (opcional), `conteudo`, `resposta`, `status` (`pendente` | `respondida`), `data_criacao`

### 4.4 `Leitura`
- `leitor_id`, `livro_id`, `status`, `nota` (1–5 ou nulo), `comentario`, `criado_em`

### 4.5 `Compra` / `Pedido` / `ItemPedido`
- Compra unitária (`Compra`) e pedidos com múltiplos itens (`Pedido`, `ItemPedido`) com baixa de estoque

### 4.6 Rede social
- `Follow`, `Friendship`, `Message`

---

## 5. Regras de negócio

1. **Solicitação:** leitor autenticado envia para `editor_id` (e opcionalmente `livro_id`); status inicial `pendente`.
2. **Resposta da editora:** apenas solicitações da própria editora; uma resposta por solicitação (`400` se já `respondida`).
3. **Leitura:** `nota`, se informada, deve estar em **1..5** (`400` caso contrário).
4. **Compra:** validar estoque; decrementar `estoque` após confirmação.
5. **Isolamento:** editora só altera/remove livros onde `editor_id` = usuário do token (`404` se não pertencer).
6. **Remoção de livro (refinamento v1.1):** `DELETE /editor/books/<id>` **não exclui** o registro; define `estoque = 0`, preservando histórico de leituras, solicitações e pedidos. Mensagem: `Livro removido do catálogo de vendas (estoque zerado)`.
7. **Recomendações (refinamento v1.1):** livros ordenados pela média de `Leitura.nota` (decrescente); livros sem notas entram com média 0. Endpoint público paginado.
8. **Filtro por gênero (refinamento v1.1):** query `genero` em listagem pública de livros, busca e listagem da editora.

---

## 6. Contrato de paginação (padrão)

Respostas paginadas retornam:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pages": 0
}
```

Query params: `page` (default 1), `per_page` (default conforme endpoint).

Endpoints paginados incluem, entre outros: `GET /reader/books`, `GET /reader/recommendations`, `GET /reader/requests`, `GET /reader/readings`, `GET /reader/feed`, `GET /editor/books`.

---

## 7. Endpoints da API

### 7.1 Autenticação (`/auth`)
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/register` | Não | Cadastro de leitor |
| POST | `/auth/login` | Não | Login; retorna `token_sessao`, `papel` |

### 7.2 Público / Leitor (`/reader`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/reader/editors` | Não | Lista editoras |
| GET | `/reader/books` | Não | Catálogo paginado; `?genero=` opcional |
| GET | `/reader/books/<id>` | Não | Detalhe do livro |
| GET | `/reader/search` | Não | Busca; `q`, `genero`, `limit` |
| GET | `/reader/recommendations` | Não | Recomendações por média de notas; paginado |
| GET | `/reader/feed` | Não | Feed de leituras; paginado |
| GET | `/reader/editors/<id>/books` | Não | Livros de uma editora |
| GET | `/reader/users/<id>` | Não | Perfil público resumido |
| GET | `/reader/users/<id>/visit` | Não | Perfil completo para visita |
| POST/DELETE | `/reader/users/<id>/follow` | JWT | Seguir / deixar de seguir |
| POST/DELETE | `/reader/users/<id>/connect` | JWT | Conexão / remover amizade |
| POST | `/reader/friendships/<id>/accept` | JWT | Aceitar amizade |
| POST | `/reader/friendships/<id>/reject` | JWT | Recusar amizade |
| GET | `/reader/notifications` | JWT | Notificações |
| GET/POST | `/reader/users/<id>/messages` | JWT | Mensagens diretas |
| GET | `/reader/conversations` | JWT | Lista de conversas; paginado |
| POST/GET | `/reader/requests` | JWT leitor | Criar / listar solicitações próprias; paginado |
| POST/GET | `/reader/readings` | JWT leitor | Registrar / listar leituras; paginado |
| DELETE | `/reader/readings/<id>` | JWT leitor | Remover leitura própria |
| POST/GET | `/reader/purchases` | JWT leitor | Compra / histórico |
| POST/GET | `/reader/orders` | JWT leitor | Pedido multi-item / listagem (checkout) |
| PUT/DELETE | `/reader/profile` | JWT | Atualizar / excluir conta |
| POST | `/reader/profile/photo` | JWT | Foto de perfil |
| PUT | `/reader/profile/password` | JWT | Alterar senha |

**Resposta enriquecida de solicitações (editora e leitor):** inclui `leitor_nome`, `livro_titulo`, `livro_autor`, `livro_imagem_url` quando aplicável.

### 7.3 Editora (`/editor`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/editor/books` | JWT editor | Lista própria; `page`, `per_page`, `q`, `genero` |
| GET | `/editor/books/lookup` | JWT editor | Busca Open Library; `q` (min. 2 chars), `limit`; retorna título, autor, descrição, gênero, capa |
| POST | `/editor/books` | JWT editor | Cadastro (multipart: `titulo`, `autor`, `preco`, `estoque`, `genero`, `descricao`, `imagem`, `open_library_cover_id`) |
| PUT | `/editor/books/<id>` | JWT editor | Atualização (inclui `estoque`, `genero`) |
| DELETE | `/editor/books/<id>` | JWT editor | Remoção lógica: `estoque = 0` |
| GET | `/editor/requests` | JWT editor | Solicitações recebidas |
| PUT | `/editor/requests/<id>/respond` | JWT editor | Responder (`resposta` no body) |

### 7.4 Admin (`/admin`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/POST | `/admin/users` | JWT admin | Listar / criar usuários |
| GET | `/admin/reports` | JWT admin | Relatórios (`total_usuarios`, `total_livros`, etc.) |
| GET | `/admin/export-csv` | JWT admin | Exportação CSV |
| POST | `/admin/refresh-metrics` | JWT admin | Atualizar métricas |

---

## 8. Frontend — arquitetura

- **Stack:** React 19, TypeScript, Vite, React Router, TanStack Query, react-hook-form + zod, react-hot-toast.
- **Camadas:** `pages/` (telas), `app/components/` (UI reutilizável), `app/ui/` (layout, auth), `lib/` (api, types, token).
- **Proxy dev:** `VITE_API_BASE_URL=/api` → Flask `:5000`.
- **Cache cliente:** TanStack Query (`staleTime` 60s, `gcTime` 5min, retry até 2x exceto 401/403/408).

---

## 9. Frontend — rotas e navegação

| Rota | Descrição | Auth |
|------|-----------|------|
| `/` | Feed + carrossel `ExploreBooks` | Público |
| `/explorar` | Grade paginada de recomendações | Público |
| `/livros` | Catálogo com busca e filtro de gênero | Público |
| `/livro/:bookId` | Detalhe do livro | Público |
| `/perfil/:userId`, `/editora/:userId` | Perfil público | Público |
| `/entrar`, `/cadastro` | Login e registro | Público |
| `/carrinho`, `/checkout` | Carrinho e finalização | Leitor |
| `/leitor/*`, `/editora/*`, `/admin/*` | Áreas por papel | JWT + `RequireAuth` |

**Navegação global (`Layout`):** links Início, Explorar, Livros; skip link “Ir para o conteúdo principal” (`#main-content`).

---

## 10. Design system e comportamento visual

### 10.1 Tokens CSS (`index.css`)

| Token | Uso |
|-------|-----|
| `--primary`, `--primary-soft` | Marca, botões, foco |
| `--surface`, `--surface-2` | Cards e fundos |
| `--muted` | Texto secundário |
| `--error`, `--success` | Feedback de estoque/erro |

Tipografia: **Public Sans**, pesos 600–900 em títulos.

### 10.2 Componentes de interface (v1.2)

| Componente | Responsabilidade |
|------------|------------------|
| `QueryStatus` | Orquestra loading / erro / vazio / conteúdo |
| `LoadingState` | Spinner ou grid skeleton |
| `ErrorState` | Alerta + botão “Tentar novamente” |
| `EmptyState` | Mensagem + CTA opcional |
| `RecommendedBookCard` | Card de livro recomendado (grid ou carrossel) |
| `Pagination` | Paginação numérica da loja |
| `StarRating` | Exibição de notas 1–5 |

### 10.3 Estados de tela (obrigatórios)

Toda listagem consumindo API deve tratar:

1. **Loading** — skeleton (explorar) ou mensagem (loja).
2. **Erro** — `ErrorState` com `onRetry` → `refetch()` do React Query.
3. **Vazio** — `EmptyState` com texto orientativo.
4. **Sucesso** — renderização da lista.

**Timeout de API:** 30s (`AbortController`); mensagem: `Tempo limite excedido. Tente novamente.` (HTTP lógico 408 no cliente).

### 10.4 Responsividade

| Breakpoint | Comportamento |
|------------|----------------|
| Desktop (>1024px) | Grade explorar até 4+ colunas; nav completa |
| Tablet (769–1024px) | Grade 3 colunas; padding reduzido |
| Mobile (≤768px) | Nav compacta (sem links desktop); grade 2 colunas; rows da loja em coluna única |

### 10.5 Acessibilidade (mínimo)

- Skip link para `#main-content`
- `:focus-visible` em controles interativos
- Labels `.sr-only` em busca e filtro de gênero da loja
- `role="list"` / `role="listitem"` em grades de livros
- `role="alert"` em erros; `aria-live` em loading
- Imagens decorativas com `alt=""` quando o título está no link pai
- `aria-label` em botões de compra e cards de livro

### 10.6 Formulários e feedback

- Validação com zod + react-hook-form nas telas de auth/configuração (padrão existente).
- Erros de API exibidos via toast (`react-hot-toast`) ou `ErrorState`.
- Sucesso de ações (ex.: adicionar ao carrinho) via toast.

### 10.7 Integração frontend ↔ API

- Cliente `api()` em `lib/api.ts`: JWT no header, parse JSON, redirect em 401.
- Listagens paginadas: consumir `{ items, total, page, pages }`.
- Explorar: `useInfiniteQuery` + `IntersectionObserver` para próxima página.
- Loja: `useQuery` com chave `['storeBooks', page, genre]`; busca global com `search.length > 1`.

---

## 11. Variáveis de ambiente

Conforme `.env.example`:

- `FLASK_APP`, `FLASK_ENV`, `FLASK_DEBUG`
- `SECRET_KEY`, `JWT_SECRET_KEY` (mín. 32 caracteres)
- `DATABASE_URI` (ex.: `sqlite:///instance/database.db`)
- `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`

---

## 12. Dependências

### Backend (`requirements.txt`)

Ver `requirements.txt`: Flask 3, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Flask-Migrate, Flasgger, python-dotenv, flask-cors, gunicorn, pytest, pytest-cov, pytest-mock.

---

### Frontend (`frontend/package.json`)

React, TanStack Query, Vitest, Testing Library — ver `frontend/COMPONENTS.md`.

---

## 13. Critérios de aceite

### Autenticação
- [ ] Registro de leitor retorna `201`
- [ ] Login válido retorna `200` com `token_sessao` e `papel`
- [ ] Credenciais inválidas retornam `401`

### Leitor
- [ ] Criar solicitação com `editor_id` válido retorna `201`
- [ ] Leitura com `nota` fora de 1..5 retorna `400`
- [ ] Token de editor/admin em rota exclusiva de leitor retorna `403`
- [ ] Listagem de solicitações próprias é paginada e não inclui solicitações de outros leitores

### Editora
- [ ] Cadastro de livro associa `editor_id` do token
- [ ] Resposta duplicada à mesma solicitação retorna `400`
- [ ] Alterar livro de outra editora retorna `404`
- [ ] `DELETE` de livro próprio zera estoque e mantém registro no banco
- [ ] Listagem de livros suporta `q` e `genero`

### Admin
- [ ] Criar usuário com papel válido retorna `201`
- [ ] Papel inválido retorna `400`
- [ ] Não-admin em `/admin/*` retorna `403`

### Exploração / recomendações (v1.1)
- [ ] `GET /reader/recommendations` retorna estrutura paginada com `average_rating`
- [ ] Página `/explorar` consome o endpoint com paginação
- [ ] `GET /reader/books?genero=Romance` filtra por gênero

### Frontend (v1.2)
- [ ] `/explorar` exibe skeleton, erro com retry e estado vazio com link para `/livros`
- [ ] `/livros` exibe loading/erro/vazio via `QueryStatus`
- [ ] Layout possui skip link e `#main-content`
- [ ] Testes Vitest passam: `cd frontend && npm run test:run`

---

## 14. Execução

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask db upgrade
python run.py
```

**Backend:** `pytest -q` na raiz.  
**Frontend:** `cd frontend && npm run test:run && npm run build`.  
Plano completo: `testing.md`.
