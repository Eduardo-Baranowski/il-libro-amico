# Plano de Testes (TDD First)

## 1. Objetivo

Definir uma estrategia de testes automatizados com abordagem **TDD First** para validar as funcionalidades criticas do sistema de gerenciamento de livros (API Flask), reduzindo risco de regressao e garantindo evolucao segura.

Este plano foca nos fluxos de maior impacto por perfil (`auth`, `reader`, `editor`, `admin`) e nas validacoes de seguranca/autorizacao.

## 2. Escopo de Teste

- API REST backend em `app/controllers/*.py`
- Regras de negocio principais dos modelos `User`, `Livro`, `Request`, `Leitura`
- Autenticacao JWT e autorizacao por papel
- Persistencia em banco SQLite isolado por teste (fixtures pytest)

Fora de escopo neste plano:

- Testes E2E de frontend
- Testes de carga/performance
- Testes de infraestrutura (Docker, deploy)

## 3. Estrategia TDD First

Para cada funcionalidade:

1. **Red**: escrever primeiro o teste de comportamento esperado (incluindo status HTTP e payload).
2. **Green**: implementar/ajustar codigo minimo para passar.
3. **Refactor**: limpar duplicacao e melhorar legibilidade sem alterar comportamento.
4. **Regression gate**: executar suite completa para garantir que alteracoes nao quebraram contratos anteriores.

Regras de priorizacao:

- Prioridade maxima para cenarios criticos de autenticacao, autorizacao e integridade de dados.
- Um teste critico minimo por funcionalidade, com expansao incremental para cenarios de borda.

## 4. Arquitetura da Suite de Testes

Estrutura sugerida:

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
- Fixtures auxiliares para criar usuarios e obter tokens JWT por papel.
- Assert de contrato HTTP: codigo, chave `message`, e campos obrigatorios de resposta.

## 5. Plano de Casos Criticos por Funcionalidade

### 5.1 Autenticacao (`/auth`)

1. **Registro de leitor**
   - Dado payload valido (`nome`, `email`, `senha`)
   - Quando `POST /auth/register`
   - Entao retorna `201` e persiste usuario com papel `leitor`.

2. **Login**
   - Dado usuario existente e senha valida
   - Quando `POST /auth/login`
   - Entao retorna `200`, `token_sessao` e `papel`.

3. **Erro de credenciais**
   - Dado senha invalida
   - Quando `POST /auth/login`
   - Entao retorna `401` com mensagem de credenciais invalidas.

### 5.2 Leitor (`/reader`)

1. **Criar solicitacao para editora**
   - Dado leitor autenticado e `editor_id` valido
   - Quando `POST /reader/requests`
   - Entao retorna `201` com `id` da solicitacao.

2. **Registrar leitura**
   - Dado leitor autenticado e livro existente
   - Quando `POST /reader/readings` com `status` valido
   - Entao retorna `201` e cria leitura.

3. **Validacao de nota**
   - Dado `nota` fora de `1..5`
   - Quando `POST /reader/readings`
   - Entao retorna `400` (regra de dominio).

4. **Acesso negado por papel**
   - Dado token de `editor` ou `admin`
   - Quando acessar rota exclusiva de leitor
   - Entao retorna `403`.

### 5.3 Editora (`/editor`)

1. **Cadastrar livro**
   - Dado editor autenticado e payload/form valido
   - Quando `POST /editor/books`
   - Entao retorna `201` e livro associado ao `editor_id` do token.

2. **Responder solicitacao**
   - Dado solicitacao pendente da propria editora
   - Quando `PUT /editor/requests/<id>/respond`
   - Entao retorna `200` e status passa a `respondida`.

3. **Impedir resposta duplicada**
   - Dado solicitacao ja respondida
   - Quando tentar responder novamente
   - Entao retorna `400`.

4. **Isolamento de dados entre editoras**
   - Dado editor A
   - Quando tenta alterar/excluir livro da editora B
   - Entao retorna `404` para nao expor recurso alheio.

### 5.4 Admin (`/admin`)

1. **Criar usuario com papel**
   - Dado admin autenticado e payload valido
   - Quando `POST /admin/users`
   - Entao retorna `201` e cria usuario com papel informado.

2. **Validacao de papel invalido**
   - Dado papel fora de `admin|editor|leitor`
   - Quando `POST /admin/users`
   - Entao retorna `400`.

3. **Relatorios**
   - Dado massa de dados conhecida
   - Quando `GET /admin/reports`
   - Entao retorna agregacoes coerentes (`total_usuarios`, `total_livros`, `usuarios`, `solicitacoes`).

4. **Acesso negado para nao admin**
   - Dado token de leitor/editor
   - Quando acessar rotas `/admin/*`
   - Entao retorna `403`.

## 6. Uso de Mocks (quando necessario)

Mocks devem ser usados apenas para dependencias externas ou efeitos colaterais nao deterministas:

- `app.utils.save_image`: mockar para evitar escrita real de arquivo em testes de upload.
- `os.remove`: mockar em testes de update/delete de livro com imagem para validar chamada sem depender de FS real.
- `flask_jwt_extended.create_access_token` (opcional em unitario puro): mock para testar fluxo sem depender do formato do token.

Preferencia geral: manter testes de API como integracao leve, mockando somente I/O externo.

## 7. Dados de Teste e Fixtures

Adicionar/expandir fixtures em `tests/conftest.py`:

- `admin_token`, `editor_token`, `reader_token`
- factories simples para `User`, `Livro`, `Request`, `Leitura`
- helper para headers autenticados: `{"Authorization": f"Bearer {token}"}`

Boas praticas:

- Cada teste independente (sem dependencia de ordem).
- Massa minima para expressar regra.
- Nomes descritivos no formato `test_<feature>_<expected_behavior>`.

## 8. Pipeline de Execucao e Anti-Regressao

Comandos recomendados:

```bash
pytest -q
pytest --maxfail=1 --disable-warnings
pytest --cov=app --cov-report=term-missing
```

Politica minima sugerida:

- PR bloqueado se qualquer teste falhar.
- Cobertura minima inicial: **80%** em `app/controllers` (meta evolutiva).
- Toda correcao de bug deve incluir teste de regressao correspondente.

## 9. Ordem de Implementacao TDD (roadmap)

1. `test_security.py`: autorizacao por papel e 401/403 (base de seguranca).
2. `test_auth.py`: registro e login.
3. `test_reader.py`: solicitacoes e leituras.
4. `test_editor.py`: livros + resposta de solicitacoes.
5. `test_admin.py`: usuarios e relatorios.
6. Cobertura e refino de cenarios de borda.

## 10. Dependencias de Teste

Dependencias adicionadas/confirmadas em `requirements.txt`:

- `pytest>=8.0.0`: framework base de testes.
- `pytest-cov>=5.0.0`: medicao de cobertura para controle de regressao.
- `pytest-mock>=3.14.0`: utilitario de mocks/patches para dependencias externas.

