# Descrição do Sistema de Cadastro de Leitura e Vendas de Livros

Este documento detalha o projeto para a plataforma centralizada de interação e vendas entre leitores e editoras. O sistema visa facilitar o gerenciamento de catálogos de livros e a comunicação de solicitações entre as partes interessadas.

## 1. Usuários e Casos de Uso

O sistema suportará os seguintes tipos de usuários e casos de uso:

### Usuários

| Tipo de Usuário | Descrição | Cadastro |
| :--- | :--- | :--- |
| **Administrador** | Usuário com acesso total para gerenciar o sistema, incluindo relatórios e gestão de usuários. Deve haver um administrador inicial via variável de ambiente. | Cadastrado por outro Administrador ou definido inicialmente. |
| **Editora** | Conta institucional responsável por gerenciar o catálogo de livros e responder às solicitações dos leitores. | Cadastrada pelo Administrador. |
| **Leitor** | Usuário final (cliente) que busca livros, gerencia amizades e envia solicitações de compra/leitura para as editoras. | Autocadastro. |

### Casos de Uso

*   **Explorar e Solicitar (Leitor):** O leitor pode buscar livros, visualizar perfis das editoras e enviar novas solicitações referentes a livros específicos.
*   **Gerenciar Catálogo e Responder Solicitação (Editora):** A editora pode realizar o CRUD de seus livros e atualizar o status das solicitações recebidas dos leitores.
*   **Gestão de Perfis Sociais (Leitor):** Leitores podem seguir outros usuários, enviar e aceitar solicitações de conexão/amizade e trocar mensagens.
*   **CRUD de Usuários (Administrador):** O administrador pode Criar, Ler, Atualizar e Deletar contas de Leitores e Editoras. Deve-se armazenar o log da operação.
*   **Relatórios Gerenciais (Administrador):** Geração de relatórios sobre o volume de solicitações, livros cadastrados e atividades na plataforma.

## 2. Arquitetura

A arquitetura do sistema será **Desacoplada (Client-Server)**, utilizando o padrão API RESTful.

*   **Camada de Apresentação (Front-end SPA):** Interface de usuário desenvolvida com React e Vite, consumindo a API e gerenciando o estado no navegador do cliente sem recarregamento da página.
*   **Camada de Lógica de Negócio (Back-end API):** Implementada em Python utilizando o framework Flask, responsável por processar as requisições HTTP, validar regras de negócio, autenticar via JWT e fornecer dados em JSON.
*   **Camada de Dados (Model):** Gerenciada pelo SQLAlchemy (ORM), que faz a ponte entre a lógica orientada a objetos do Python e o banco de dados SQLite.

O sistema será containerizado usando Docker e Docker Compose para orquestrar o frontend e o backend simultaneamente.

## 3. Plataforma Tecnológica

*   **Linguagem de Programação:** Python (Backend) / TypeScript (Frontend)
*   **Framework Web:** Flask (API) / React + Vite (SPA)
*   **Estilização:** CSS Vanilla
*   **Banco de Dados:** SQLite
*   **Autenticação:** Flask-JWT-Extended
*   **Containerização:** Docker e Docker Compose
*   **Controle de Versão:** GitHub

## 4. Estrutura de Diretórios

```text
├── lumina-library/
│   ├── app/                    # Backend Flask
│   │   ├── models/             # Modelos SQLAlchemy (ex: user.py, book.py)
│   │   ├── controllers/        # Controladores e Rotas (ex: auth.py, reader.py)
│   │   ├── __init__.py         # Inicialização do Flask
│   │   └── database.py         # Configuração do DB
│   ├── frontend/               # Frontend React
│   │   ├── src/
│   │   │   ├── app/            # Configurações centrais, router.tsx, ui/
│   │   │   ├── components/     # Componentes reutilizáveis (ExploreBooks.tsx)
│   │   │   └── pages/          # Páginas inteiras da aplicação
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── run.py                  # Ponto de entrada do Backend
│   ├── requirements.txt        # Dependências do Python
│   ├── docker-compose.yml      # Orquestração dos containers
│   └── .env                    # Variáveis de ambiente
```

## 5. Convenções

*   **Nomenclatura (Python):** Seguir PEP 8. Métodos em `snake_case`, Classes em `CamelCase`.
*   **Nomenclatura (TypeScript/React):** Componentes em `PascalCase` (ex: `ExploreBooks.tsx`), funções em `camelCase`.
*   **Modelos e Banco:** Classes no singular (`User`, `Book`), tabelas no plural (`users`, `books`).
*   **Commits (Git):** Padrão Conventional Commits (ex: `feat: adiciona envio de solicitacao`, `fix: corrige erro no login`).

## 6. Serviços

*   **Serviço de Autenticação (`/auth`):** Login, geração de tokens JWT e registro de leitores.
*   **Serviço do Leitor (`/reader`):** Exploração do catálogo, gestão de amizades, envio de solicitações e mensagens.
*   **Serviço da Editora (`/editor`):** CRUD de livros próprios e gerenciamento das respostas às solicitações dos leitores.
*   **Serviço do Administrador (`/admin`):** Gestão global de usuários e relatórios de métricas.

## 7. Variáveis de Ambiente

| Variável | Uso | Exemplo de Valor |
| :--- | :--- | :--- |
| `SECRET_KEY` | Chave do Flask. | `super_secret_key` |
| `JWT_SECRET_KEY` | Chave de assinatura dos tokens. | `jwt_secret_hash` |
| `ADMIN_INITIAL_EMAIL` | Email do administrador inicial. | `admin@lumina.com` |
| `ADMIN_INITIAL_PASSWORD`| Senha do administrador inicial. | `senha123` |
| `VITE_API_BASE_URL` | Base URL da API para o frontend. | `http://127.0.0.1:5000` |

## 8. Definição de Usuários e Fluxo de Cadastro

*   **Administrador Inicial:** Criado automaticamente via script no `run.py` se não existir, lendo as variáveis do `.env`.
*   **Leitor (Autocadastro):**
    1. Acessa a página de registro no frontend.
    2. Preenche dados pessoais e envia o formulário.
    3. Cadastro é processado por `/auth/register`.
*   **Editora (Cadastro pelo Admin):**
    1. Administrador acessa o Painel de Controle.
    2. Navega para "Gestão de Editoras" e insere os dados.
    3. Conta institucional é criada e as credenciais enviadas à editora.

---

# 4. Especificação Técnica (Spec)

## 4.1. Backend API

```text
/run.py
- ação: criar
- descrição: Ponto de entrada da aplicação backend, responsável por inicializar o app Flask e criar o administrador inicial caso não exista.
- pseudocódigo:
  INICIAR app Flask
  LER ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD das variáveis de ambiente
  SE admin_email NÃO EXISTE no banco de dados:
    CRIAR usuário com papel='admin', email=admin_email, senha_hash=hash(admin_password)
    SALVAR no banco
  INICIAR servidor na porta 5000
```

```text
/app/models/user.py
- ação: criar
- descrição: Modelo SQLAlchemy que representa os usuários da aplicação (Admin, Leitor, Editora).
- pseudocódigo:
  CLASSE User(ModeloDB):
    id = Inteiro(ChavePrimaria)
    nome = String(Obrigatório)
    email = String(Único, Obrigatório)
    senha_hash = String(Obrigatório)
    papel = String(Valores: 'admin', 'leitor', 'editora')
    METODO verificar_senha(senha_texto):
      RETORNAR comparar_hash(self.senha_hash, senha_texto)
```

```text
/app/models/book.py
- ação: criar
- descrição: Modelo que representa os livros cadastrados pelas editoras.
- pseudocódigo:
  CLASSE Book(ModeloDB):
    id = Inteiro(ChavePrimaria)
    titulo = String(Obrigatório)
    editora_id = Inteiro(ChaveEstrangeira('user.id'))
    quantidade_estoque = Inteiro(Padrão: 0)
    genero = String(Opcional)
```

```text
/app/controllers/auth.py
- ação: criar
- descrição: Rotas do Blueprint responsável pela autenticação e emissão de JWT.
- pseudocódigo:
  ROTA POST '/auth/register':
    RECEBER dados_cadastro
    VALIDAR se email já existe
    CRIAR novo leitor
    RETORNAR sucesso

  ROTA POST '/auth/login':
    RECEBER email, senha
    BUSCAR usuario POR email
    SE usuario EXISTE e verificar_senha(senha) FOR VERDADEIRO:
      GERAR access_token = criar_jwt(identidade=usuario.id, papel=usuario.papel)
      RETORNAR { "token": access_token }
    SENÃO:
      RETORNAR erro 401 "Credenciais inválidas"
```

```text
/app/controllers/reader.py
- ação: criar
- descrição: Blueprint que engloba as interações públicas e exclusivas de leitores.
- pseudocódigo:
  # Exploração de Usuários e Editoras
  ROTA GET '/reader/editors':
    RETORNAR lista de perfis de editoras ativas
  ROTA GET '/reader/users/<id>':
    RETORNAR perfil público de um usuário/editora
  ROTA GET '/reader/users/<id>/visit':
    RETORNAR dados completos formatados para a página de visita
  
  # Sistema Social
  ROTA GET '/reader/users/<id>/relation':
    RETORNAR status da amizade/conexão atual
  ROTA POST/DELETE '/reader/users/<id>/follow':
    CRIAR ou REMOVER relação de seguir (follow)
  ROTA POST/DELETE '/reader/users/<id>/connect':
    ENVIAR pedido de amizade ou REMOVER amizade
  ROTA POST '/reader/friendships/<id>/accept':
    ACEITAR solicitação de amizade pendente
  ROTA POST '/reader/friendships/<id>/reject':
    RECUSAR solicitação de amizade pendente
  ROTA GET '/reader/notifications':
    RETORNAR lista de notificações de amizades e mensagens
  ROTA GET/POST '/reader/users/<id>/messages':
    LISTAR histórico ou ENVIAR nova mensagem direta
  
  # Exploração de Catálogo
  ROTA GET '/reader/books':
    RETORNAR lista de livros (suporta paginação e ?genero=...)
  ROTA GET '/reader/recommendations':
    RETORNAR lista de livros com melhores notas
  ROTA GET '/reader/search':
    RECEBER ?q=... e RETORNAR resultados (livros, usuários, editoras)
  ROTA GET '/reader/books/<id>':
    RETORNAR detalhes do livro
  ROTA GET '/reader/editors/<id>/books':
    RETORNAR catálogo da editora específica

  # Compras e Solicitações
  ROTA POST '/reader/requests':
    EXIGIR JWT(leitor)
    CRIAR solicitação para editor_id informando livro_id
  ROTA GET '/reader/requests':
    EXIGIR JWT(leitor)
    RETORNAR histórico de solicitações do leitor
  ROTA POST '/reader/purchases':
    EXIGIR JWT(leitor)
    CRIAR registro de compra e DAR BAIXA em estoque
  ROTA GET '/reader/purchases':
    EXIGIR JWT(leitor)
    RETORNAR histórico de compras do leitor
```

```text
/app/controllers/editor.py
- ação: criar
- descrição: Blueprint protegido para editoras gerenciarem seu catálogo e demandas.
- pseudocódigo:
  ROTA GET '/editor/books':
    EXIGIR JWT(editora)
    RETORNAR lista de livros pertencentes à editora logada
  ROTA POST '/editor/books':
    EXIGIR JWT(editora)
    RECEBER dados e upload de imagem
    CRIAR novo livro no banco
  ROTA PUT '/editor/books/<id>':
    EXIGIR JWT(editora)
    ATUALIZAR dados e quantidade_estoque do livro
  ROTA DELETE '/editor/books/<id>':
    EXIGIR JWT(editora)
    ZERAR estoque do livro (soft-delete para manter histórico)
  ROTA GET '/editor/requests':
    EXIGIR JWT(editora)
    RETORNAR solicitações recebidas pela editora
  ROTA PUT '/editor/requests/<id>/respond':
    EXIGIR JWT(editora)
    ATUALIZAR status da solicitação (aprovada/rejeitada/respondida)
```

```text
/app/controllers/admin.py
- ação: criar
- descrição: Blueprint protegido para administração do sistema.
- pseudocódigo:
  ROTA GET '/admin/users':
    EXIGIR JWT(admin)
    RETORNAR lista completa de todos os usuários
  ROTA POST '/admin/users':
    EXIGIR JWT(admin)
    CRIAR novo usuário (admin, leitor ou editora) com senha inicial
  ROTA GET '/admin/reports':
    EXIGIR JWT(admin)
    GERAR e RETORNAR métricas de acessos, vendas e status
```

## 4.2. Frontend SPA

```text
/frontend/src/app/router.tsx
- ação: criar
- descrição: Definição das rotas do frontend usando React Router.
- pseudocódigo:
  CONFIGURAR Rotas:
    ROTA '/' -> REDIRECIONAR PARA '/explore'
    ROTA '/explore' -> COMPONENTE <ExplorePage />
    ROTA '/login' -> COMPONENTE <LoginPage />
    ROTA '/editor/dashboard' -> PROTEGER_ROTA(papel='editora') -> <EditorDashboard />
```

```text
/frontend/src/pages/public/ExplorePage.tsx
- ação: criar
- descrição: Página pública onde leitores podem ver livros disponíveis e buscar por títulos.
- pseudocódigo:
  COMPONENTE ExplorePage:
    ESTADO livros = []
    AO_MONTAR:
      FAZER FETCH em '/api/reader/books'
      ATUALIZAR ESTADO livros com os dados da API
    RETORNAR:
      UI com Barra de Busca
      LOOP em livros:
        RENDERIZAR <BookCard livro={livro} />
```

```text
/frontend/src/app/components/ExploreBooks.tsx
- ação: modificar
- descrição: Componente para exibir um carrossel horizontal de livros na versão mobile.
- pseudocódigo:
  COMPONENTE ExploreBooks(props: livros):
    RETORNAR:
      DIV(estilo='flex, scroll-horizontal, centralizado-mobile')
        PARA CADA livro EM livros:
          DIV(Cartão do Livro com Imagem, Título e Botão "Solicitar")
```
