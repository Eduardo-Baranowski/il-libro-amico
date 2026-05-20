# Auditoria de Segurança — Lumina Library

| Campo | Valor |
|-------|--------|
| **Escopo** | Repositório completo (`app/`, `frontend/`, `migrations/`, `tests/`, `scripts/`, `docker-compose.yml`, `Dockerfile`, configuração e dependências) |
| **Profundidade** | **Profunda** (revisão estática de código, configuração, fluxos de autenticação/autorização, entrada de dados, criptografia e superfície de exposição) |
| **Data** | 18/05/2026 |
| **Metodologia** | OWASP Top 10 (2025), CWE, boas práticas Flask/React, threat modeling orientado a abuso |

---

## Resumo executivo

A aplicação Lumina Library (API Flask + SPA React) implementa autenticação JWT com bcrypt e separação de papéis (`admin`, `editor`, `leitor`) na maioria das rotas sensíveis. Há testes automatizados básicos de autorização (`tests/test_security.py`). Porém, foram identificadas falhas que, em ambiente exposto à internet, permitem **degradação de integridade de negócio** (estoque), **comprometimento de contas** (via XSS + token em `localStorage`) e **exposição de dados** (PII, documentação da API, mensagens de erro internas).

### Contagem de achados por severidade

| Severidade | Quantidade |
|------------|------------|
| **Crítica** | 2 |
| **Alta** | 9 |
| **Média** | 12 |
| **Baixa** | 6 |
| **Total** | **29** |

### Cinco ações mais urgentes

1. **Corrigir validação de `quantidade` em `POST /reader/orders`** — rejeitar valores ≤ 0 e tipos inválidos antes de alterar estoque (evita aumento artificial de inventário).
2. **Proibir chaves padrão em produção** — falhar na inicialização se `SECRET_KEY` / `JWT_SECRET_KEY` forem valores de desenvolvimento ou ausentes.
3. **Mover JWT para cookie `HttpOnly` + `Secure` + `SameSite`** (ou BFF) e endurecer CSP no frontend — reduz impacto de XSS roubar sessão.
4. **Implementar rate limiting e política de senha no backend** em `/auth/login`, `/auth/register` e troca de senha.
5. **Restringir CORS, desabilitar Swagger em produção e desligar `FLASK_DEBUG`** — reduzir superfície e vazamento de informação.

---

## Mapa OWASP Top 10 (2025)

| Categoria OWASP | Achados relevantes |
|-----------------|-------------------|
| A01 Broken Access Control | SEC-007, SEC-008, SEC-009, SEC-010 |
| A02 Security Misconfiguration | SEC-001, SEC-002, SEC-003, SEC-004, SEC-005 |
| A03 Software Supply Chain Failures | SEC-027, SEC-028 |
| A04 Cryptographic Failures | SEC-001, SEC-006, SEC-011 |
| A05 Injection | SEC-012 (baixo risco SQLAlchemy ORM) |
| A06 Insecure Design | SEC-013, SEC-014, SEC-015, SEC-016 |
| A07 Authentication Failures | SEC-006, SEC-017, SEC-018, SEC-019 |
| A08 Software or Data Integrity Failures | SEC-013, SEC-020 |
| A09 Security Logging and Alerting Failures | SEC-029 |
| A10 Mishandling of Exceptional Conditions | SEC-021, SEC-022 |

---

## Achados detalhados

---

### SEC-001 — Chaves criptográficas com fallback inseguro

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Crítica** |
| **OWASP** | A04 Cryptographic Failures, A02 Security Misconfiguration |
| **CWE** | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) (Use of Hard-coded Credentials), [CWE-321](https://cwe.mitre.org/data/definitions/321.html) |

**Localização:** `app/__init__.py`, função `create_app()`, linhas 37–40.

**Descrição:** Se `SECRET_KEY` e `JWT_SECRET_KEY` não estiverem definidas no ambiente, a aplicação usa o valor fixo `dev-only-change-me-use-env`, permitindo forjar ou validar tokens JWT em produção.

**Evidência:**

```37:40:app/__init__.py
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", os.environ.get("JWT_SECRET_KEY", "dev-only-change-me-use-env")
    )
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", app.config["SECRET_KEY"])
```

**Impacto:** Comprometimento total da autenticação; qualquer atacante pode emitir JWT válidos para qualquer usuário/papel.

**Recomendação:**

```python
def _require_env(name: str, min_len: int = 32) -> str:
    value = os.environ.get(name, "").strip()
    if len(value) < min_len or value == "dev-only-change-me-use-env":
        raise RuntimeError(f"{name} ausente ou insegura (mín. {min_len} caracteres aleatórios)")
    return value

app.config["JWT_SECRET_KEY"] = _require_env("JWT_SECRET_KEY")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or app.config["JWT_SECRET_KEY"]
```

**Referências:** OWASP ASVS V2.6, [CWE-798](https://cwe.mitre.org/data/definitions/798.html).

---

### SEC-002 — Manipulação de estoque via quantidade negativa em pedidos

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Crítica** |
| **OWASP** | A01 Broken Access Control, A06 Insecure Design, A10 Mishandling of Exceptional Conditions |
| **CWE** | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) (Improper Input Validation), [CWE-841](https://cwe.mitre.org/data/definitions/841.html) |

**Localização:** `app/controllers/reader.py`, função `create_order()`, linhas 1150–1161.

**Descrição:** `POST /reader/orders` não valida que `quantidade` seja inteiro positivo. Com `quantidade` negativa, a verificação `livro.estoque < quantidade` falha e `livro.estoque -= quantidade` **aumenta** o estoque.

**Evidência:**

```1150:1161:app/controllers/reader.py
        for item in items_data:
            livro = Livro.query.get(item['livro_id'])
            if not livro:
                db.session.rollback()
                return jsonify({"message": f"Livro ID {item['livro_id']} não encontrado"}), 400
            
            if livro.estoque < item['quantidade']:
                db.session.rollback()
                return jsonify({"message": f"O livro '{livro.titulo}' possui apenas {livro.estoque} unidades em estoque."}), 400
            
            # Subtrair estoque
            livro.estoque -= item['quantidade']
```

**Impacto:** Integridade financeira e de inventário comprometida; possível “compra” com estorno de estoque ou pedidos com total zerado/negativo.

**Recomendação:**

```python
try:
    qty = int(item.get("quantidade", 0))
except (TypeError, ValueError):
    db.session.rollback()
    return jsonify({"message": "quantidade inválida"}), 400
if qty <= 0:
    db.session.rollback()
    return jsonify({"message": "quantidade deve ser maior que zero"}), 400
# usar qty nas comparações e atualizações
```

**Referências:** [CWE-20](https://cwe.mitre.org/data/definitions/20.html).

---

### SEC-003 — CORS permissivo na API

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A02 Security Misconfiguration |
| **CWE** | [CWE-942](https://cwe.mitre.org/data/definitions/942.html) |

**Localização:** `app/__init__.py`, linha 19.

**Descrição:** `CORS(app)` sem restrição de `origins` permite que qualquer origem no navegador invoque a API. Combinado com outros vetores (XSS, token vazado), amplia superfície de ataque.

**Evidência:**

```17:19:app/__init__.py
def create_app():
    app = Flask(__name__, instance_relative_config=True)
    CORS(app)
```

**Impacto:** Facilita ataques cross-origin baseados em browser; em cenários com credenciais mal configuradas no futuro, risco aumenta.

**Recomendação:**

```python
CORS(
    app,
    resources={r"/*": {"origins": os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")}},
    supports_credentials=False,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)
```

**Referências:** [CWE-942](https://cwe.mitre.org/data/definitions/942.html).

---

### SEC-004 — Modo debug habilitado por padrão

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A02 Security Misconfiguration, A10 Mishandling of Exceptional Conditions |
| **CWE** | [CWE-489](https://cwe.mitre.org/data/definitions/489.html) |

**Localização:** `.env.example` linha 2; `run.py` linhas 38–39.

**Descrição:** `FLASK_DEBUG=1` no exemplo e default `debug=True` quando variável ausente expõem stack traces e podem habilitar debugger interativo.

**Evidência:**

```38:39:run.py
    debug = os.environ.get("FLASK_DEBUG", "1") not in ("0", "false", "False")
    app.run(debug=debug, host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
```

**Impacto:** Vazamento de caminhos, variáveis e lógica interna; RCE em configurações com debugger exposto na rede.

**Recomendação:** Default `FLASK_DEBUG=0`; em produção usar apenas Gunicorn sem debug; documentar `.env.example` com `FLASK_DEBUG=0`.

**Referências:** [CWE-489](https://cwe.mitre.org/data/definitions/489.html).

---

### SEC-005 — Documentação Swagger/Flasgger pública

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A02 Security Misconfiguration |
| **CWE** | [CWE-200](https://cwe.mitre.org/data/definitions/200.html) |

**Localização:** `app/__init__.py`, linhas 42–67 (`/apidocs/`, `/apispec_1.json`).

**Descrição:** Interface Swagger está sempre ativa, revelando rotas, parâmetros e modelo de autenticação.

**Evidência:**

```42:47:app/__init__.py
    app.config['SWAGGER'] = {
        'title': 'API de Gerenciamento de Livros',
        'uiversion': 3,
        'specs_route': '/apidocs/',
        ...
        'swagger_ui': True,
```

**Impacto:** Reconhecimento facilitado para atacantes; mapeamento completo da API sem autenticação.

**Recomendação:** Registrar Swagger apenas se `os.environ.get("ENABLE_SWAGGER") == "1"` e restringir por IP ou autenticação admin.

---

### SEC-006 — JWT armazenado em `localStorage` (frontend)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A07 Authentication Failures, A04 Cryptographic Failures |
| **CWE** | [CWE-922](https://cwe.mitre.org/data/definitions/922.html) |

**Localização:** `frontend/src/lib/token.ts`, linhas 8–17; `frontend/src/lib/api.ts`, linha 27.

**Descrição:** O token de sessão persiste em `localStorage`, acessível a qualquer script na origem — inclusive injetado via XSS.

**Evidência:**

```12:17:frontend/src/lib/token.ts
export function setToken(token: string, role: Role, name: string, image: string | null) {
  localStorage.setItem(KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  ...
}
```

**Impacto:** Um único XSS no domínio do frontend permite roubo de sessão e ações como o usuário em toda a API.

**Recomendação:** Cookie `HttpOnly; Secure; SameSite=Lax` emitido pelo backend no login; ou proxy BFF que guarda o token server-side. Complementar com CSP restritiva.

**Referências:** OWASP Session Management Cheat Sheet, [CWE-922](https://cwe.mitre.org/data/definitions/922.html).

---

### SEC-007 — IDOR: listagem de leituras de qualquer usuário

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-639](https://cwe.mitre.org/data/definitions/639.html) |

**Localização:** `app/controllers/reader.py`, função `list_readings()`, linhas 758–773.

**Descrição:** Rota exige JWT mas **não** `@verificar_leitor` nem verifica se o solicitante pode ver o `user_id` alvo. Qualquer papel autenticado pode passar `?user_id=` e obter leituras, notas e comentários de outros leitores.

**Evidência:**

```758:773:app/controllers/reader.py
@reader_bp.route("/readings", methods=["GET"])
@jwt_required()
def list_readings():
    current_user_id = int(get_jwt_identity())
    target_user_id = request.args.get('user_id', current_user_id, type=int)
    ...
    pagination = (
        Leitura.query.filter_by(leitor_id=target_user_id)
```

**Impacto:** Violação de privacidade; exposição de histórico de leitura e comentários.

**Recomendação:** Permitir `user_id` diferente do atual apenas para dados já públicos no perfil, ou exigir relação (seguidor/amigo). Caso contrário: `if target_user_id != current_user_id: return 403`.

---

### SEC-008 — Rotas de perfil sem restrição de papel

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-285](https://cwe.mitre.org/data/definitions/285.html) |

**Localização:** `app/controllers/reader.py` — `update_profile`, `update_profile_photo`, `update_password`, `delete_account` (linhas 1222–1300).

**Descrição:** Endpoints sob `/reader/profile*` usam apenas `@jwt_required()`, não `@verificar_leitor`. Admin/editor podem alterar perfil via mesmas rotas (pode ser intencional, mas diverge da especificação que associa perfil ao leitor).

**Impacto:** Superfície ampliada; comportamento inconsistente com documentação; risco se regras de negócio assumirem “somente leitor”.

**Recomendação:** Aplicar `@verificar_leitor` ou mover rotas de perfil para blueprint neutro `/me` com autorização explícita por papel.

---

### SEC-009 — Mensagens acessíveis a qualquer usuário autenticado

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control, A06 Insecure Design |
| **CWE** | [CWE-862](https://cwe.mitre.org/data/definitions/862.html) |

**Localização:** `app/controllers/reader.py`, `list_messages_with_user`, `send_message_to_user` (linhas 377–437).

**Descrição:** Não há `@verificar_leitor`; contas `admin`/`editor` podem ler/enviar mensagens pelo mesmo canal dos leitores.

**Impacto:** Depende do modelo de negócio; se mensagens forem exclusivas de leitores, é falha de autorização.

**Recomendação:** Restringir a `leitor` ou documentar explicitamente como feature; adicionar bloqueio/opt-in entre papéis.

---

### SEC-010 — Papel (`papel`) apenas no JWT, sem revalidação no servidor

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-613](https://cwe.mitre.org/data/definitions/613.html) |

**Localização:** `app/controllers/auth.py` linhas 95–98; decoradores `verificar_*` em controllers.

**Descrição:** Autorização usa claim `papel` do token. Se o admin rebaixar um usuário no banco, o token antigo mantém privilégios até expirar.

**Impacto:** Escalação ou manutenção de acesso após revogação administrativa.

**Recomendação:** Em rotas sensíveis, reconsultar `User.papel` no banco ou manter denylist de `jti`/versão de sessão.

---

### SEC-011 — Ausência de HTTPS e cabeçalhos de segurança

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A02 Security Misconfiguration |
| **CWE** | [CWE-319](https://cwe.mitre.org/data/definitions/319.html) |

**Localização:** `app/__init__.py` (ausência); `docker-compose.yml`; `frontend/vite.config.ts` (proxy HTTP).

**Descrição:** Não há `flask-talisman`, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP ou `Referrer-Policy`. Deploy local/Docker usa HTTP.

**Impacto:** MITM, clickjacking, MIME sniffing; tokens e credenciais trafegam em texto claro se TLS não for terminado externamente.

**Recomendação:** Terminar TLS no reverse proxy; adicionar Talisman ou headers no proxy; `Strict-Transport-Security` em produção.

**Referências:** [CWE-319](https://cwe.mitre.org/data/definitions/319.html).

---

### SEC-012 — SQL Injection (risco residual)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A05 Injection |
| **CWE** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) |

**Localização:** Consultas em `app/controllers/reader.py`, `editor.py`, `admin.py`.

**Descrição:** Predominância de SQLAlchemy ORM e parâmetros em `ilike(f"%{q}%")` — padrão seguro. Não foram encontradas concatenações SQL brutas em produção.

**Evidência (padrão seguro):**

```538:545:app/controllers/reader.py
        like = f"%{q}%"
        book_query = book_query.join(User, Livro.editor_id == User.id).filter(
            db.or_(
                Livro.titulo.ilike(like),
                ...
```

**Impacto:** Baixo no estado atual; risco aumenta se futuras features usarem `text()` com entrada do usuário.

**Recomendação:** Manter ORM; code review obrigatório para `sqlalchemy.text()`; testes de fuzz em `/reader/search`.

---

### SEC-013 — Condição de corrida em decremento de estoque

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A06 Insecure Design, A08 Software or Data Integrity Failures |
| **CWE** | [CWE-362](https://cwe.mitre.org/data/definitions/362.html) |

**Localização:** `create_purchase`, `create_order` em `app/controllers/reader.py`.

**Descrição:** Leitura e escrita de `estoque` sem lock transacional (`SELECT FOR UPDATE`) permitem overselling em requisições concorrentes.

**Impacto:** Vendas acima do estoque real; inconsistência pedido/inventário.

**Recomendação:** `with_for_update()` na linha do livro dentro da transação; ou constraint/check no banco.

---

### SEC-014 — Pagamento simulado sem validação de integridade

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A06 Insecure Design |
| **CWE** | [CWE-345](https://cwe.mitre.org/data/definitions/345.html) |

**Localização:** `app/controllers/reader.py`, `create_order()` — `metodo_pagamento` default `'simulado'`.

**Descrição:** Pedidos são confirmados sem gateway de pagamento, assinatura ou idempotência.

**Impacto:** Aceitável em MVP; em produção, fraude e pedidos duplicados.

**Recomendação:** Integrar PSP com webhooks assinados; chave de idempotência por checkout.

---

### SEC-015 — Registro público sem mitigação de abuso

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A06 Insecure Design, A07 Authentication Failures |
| **CWE** | [CWE-770](https://cwe.mitre.org/data/definitions/770.html) |

**Localização:** `app/controllers/auth.py`, `register()`; `frontend/src/pages/auth/RegisterPage.tsx`.

**Descrição:** Qualquer um pode criar contas `leitor` sem CAPTCHA, verificação de e-mail ou rate limit.

**Impacto:** Spam, enumeração de recursos, armazenamento abusivo.

**Recomendação:** Rate limit por IP; verificação de e-mail; opcional CAPTCHA (hCaptcha/Turnstile).

---

### SEC-016 — Mensagens sem limite de tamanho nem moderação

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A06 Insecure Design |
| **CWE** | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) |

**Localização:** `send_message_to_user`, `create_reading` (campo `comentario`).

**Descrição:** Conteúdo é aceito sem `maxlength` no servidor.

**Impacto:** DoS por payloads grandes; armazenamento excessivo.

**Recomendação:** `len(conteudo) <= 4000` (exemplo); validar comentários de leitura igualmente.

---

### SEC-017 — Política de senha fraca no backend

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A07 Authentication Failures |
| **CWE** | [CWE-521](https://cwe.mitre.org/data/definitions/521.html) |

**Localização:** `app/controllers/auth.py` (`register`); `update_password` em `reader.py`; `admin.py` `create_user`.

**Descrição:** API aceita senhas de qualquer tamanho/complexidade (frontend exige mín. 6 no cadastro, mas API não valida).

**Evidência:** Registro só verifica presença de `senha`, não comprimento mínimo.

**Impacto:** Contas com senhas triviais; força bruta viável sem rate limit.

**Recomendação:** Validar mín. 12 caracteres, lista de senhas comuns (Have I Been Pwned), bcrypt cost factor documentado.

---

### SEC-018 — Ausência de rate limiting e lockout no login

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A07 Authentication Failures |
| **CWE** | [CWE-307](https://cwe.mitre.org/data/definitions/307.html) |

**Localização:** `app/controllers/auth.py`, `login()`.

**Descrição:** Não há throttling por IP/conta nem atraso progressivo após falhas.

**Impacto:** Ataques de força bruta e credential stuffing.

**Recomendação:** Flask-Limiter ou proxy (nginx `limit_req`); bloqueio temporário após N tentativas.

---

### SEC-019 — Enumeração de usuários por e-mail

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A07 Authentication Failures |
| **CWE** | [CWE-204](https://cwe.mitre.org/data/definitions/204.html) |

**Localização:** `register()` retorna `"Email já cadastrado"`; `login()` retorna mensagem genérica (bom), mas registro revela existência.

**Impacto:** Lista de e-mails válidos para phishing.

**Recomendação:** Resposta genérica no registro: “Se o e-mail for válido, enviaremos instruções”.

---

### SEC-020 — Vazamento de detalhes internos em erros HTTP 500

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A10 Mishandling of Exceptional Conditions |
| **CWE** | [CWE-209](https://cwe.mitre.org/data/definitions/209.html) |

**Localização:** `app/controllers/reader.py`, `create_order()`, linhas 1184–1186.

**Evidência:**

```1184:1186:app/controllers/reader.py
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500
```

**Impacto:** Exposição de mensagens de exceção SQL/Python ao cliente.

**Recomendação:** Logar `e` no servidor; retornar `{"message": "Erro interno ao processar pedido"}`.

---

### SEC-021 — `except Exception: pass` oculta falhas de JWT

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A10 Mishandling of Exceptional Conditions |
| **CWE** | [CWE-396](https://cwe.mitre.org/data/definitions/396.html) |

**Localização:** `app/controllers/reader.py`, `get_book_details()`, linhas 642–644.

**Evidência:**

```642:644:app/controllers/reader.py
    except Exception:
        # If JWT verification fails for any reason, we just don't return the reading status
        pass
```

**Impacto:** Mascara erros reais; dificulta detecção de tokens malformados ou bugs.

**Recomendação:** Capturar exceções específicas do JWT (`JWTExtendedException`).

---

### SEC-022 — Upload de imagem validado só por extensão

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Alta** |
| **OWASP** | A08 Software or Data Integrity Failures |
| **CWE** | [CWE-434](https://cwe.mitre.org/data/definitions/434.html) |

**Localização:** `app/utils.py`, `allowed_file()` e `save_image()`.

**Descrição:** Validação baseada em sufixo do nome do arquivo; não há verificação de magic bytes nem re-encode da imagem.

**Evidência:**

```7:9:app/utils.py
def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]
```

**Impacto:** Upload de arquivo malicioso disfarçado; risco se servidor servir `uploads/` com MIME incorreto ou execução (cenários legados).

**Recomendação:** Usar Pillow para abrir e re-salvar imagem; rejeitar SVG; servir uploads de domínio/CDN separado sem execução.

---

### SEC-023 — Arquivos estáticos de upload acessíveis publicamente

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-552](https://cwe.mitre.org/data/definitions/552.html) |

**Localização:** `app/utils.py`, `image_url()` → `url_for("static", filename=f"uploads/{rel_path}")`.

**Descrição:** Fotos de perfil e capas ficam em URL previsível sem controle de acesso.

**Impacto:** Enumeração/guess de URLs; exposição de fotos “privadas” se nomes forem previsíveis (mitigado por UUID no nome do arquivo).

**Recomendação:** URLs assinadas com expiração ou proxy autenticado para conteúdo sensível.

---

### SEC-024 — Exportação CSV com PII sem auditoria

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control, A09 Security Logging |
| **CWE** | [CWE-359](https://cwe.mitre.org/data/definitions/359.html) |

**Localização:** `app/controllers/admin.py`, `export_csv()`; `frontend/src/pages/admin/AdminReportsPage.tsx`.

**Descrição:** Admin exporta ID, nome, e-mail e papel de todos os usuários; não há log de quem exportou.

**Impacto:** Vazamento em massa se conta admin comprometida.

**Recomendação:** Log estruturado de exportação; mascarar e-mail parcial; exigir re-autenticação.

---

### SEC-025 — Admin pode criar outros administradores

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-269](https://cwe.mitre.org/data/definitions/269.html) |

**Localização:** `app/controllers/admin.py`, `create_user()`, linhas 98–108.

**Descrição:** `papel` pode ser `admin` via API sem confirmação adicional.

**Impacto:** Escalação permanente se credenciais admin vazarem.

**Recomendação:** Criação de `admin` apenas via CLI/bootstrap; MFA para admins.

---

### SEC-026 — Credenciais de exemplo em repositório

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A02 Security Misconfiguration, A04 Cryptographic Failures |
| **CWE** | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |

**Localização:** `.env.example`, `docker-compose.yml`, `test_api.py`, `project_specification.md`.

**Evidência:**

```11:14:.env.example
DATABASE_URI=postgresql+psycopg://user_livro:senha_segura_123@localhost:5432/il_libro_amico_db
ADMIN_INITIAL_EMAIL=admin@sistema.com.br
ADMIN_INITIAL_PASSWORD=senha_provisoria_segura
```

**Impacto:** Reutilização de senhas em deploys reais; comprometimento do Postgres se porta 5432 estiver exposta.

**Recomendação:** Placeholders sem valores reais; secrets via Docker secrets/K8s; nunca commitar `.env`.

---

### SEC-027 — Dependências Python parcialmente não fixadas

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A03 Software Supply Chain Failures |
| **CWE** | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html) |

**Localização:** `requirements.txt` — `psycopg[binary]>=3.1.0`, `gunicorn>=22.0.0`, `requests>=2.31.0`.

**Descrição:** Versões flutuantes podem introduzir vulnerabilidades sem revisão.

**Impacto:** Supply chain não reprodutível; CVEs novas entram automaticamente no build.

**Recomendação:** `pip freeze` ou lockfile; `pip-audit` / Dependabot no CI.

---

### SEC-028 — Frontend sem lockfile auditado em CI

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A03 Software Supply Chain Failures |
| **CWE** | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html) |

**Localização:** `frontend/package-lock.json`; ausência de pipeline `.github/`.

**Descrição:** Não há workflow automatizado para `npm audit` / SAST.

**Recomendação:** CI com `npm audit --production`, `bandit`, `semgrep`.

---

### SEC-029 — Ausência de logging e alertas de segurança

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A09 Security Logging and Alerting Failures |
| **CWE** | [CWE-778](https://cwe.mitre.org/data/definitions/778.html) |

**Localização:** Projeto inteiro — sem módulo de audit log.

**Descrição:** Falhas de login, export CSV, mudança de senha, exclusão de conta e pedidos não geram trilha de auditoria estruturada.

**Impacto:** Detecção e resposta a incidentes prejudicadas.

**Recomendação:** Logger JSON com `user_id`, `ip`, `action`, `resource`; integração SIEM; alertas em picos de 401/403.

---

### SEC-030 — Container Docker executando como root (provável)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A02 Security Misconfiguration |
| **CWE** | [CWE-250](https://cwe.mitre.org/data/definitions/250.html) |

**Localização:** `Dockerfile` — sem usuário não privilegiado.

**Impacto:** Escape de container com mais impacto no host.

**Recomendação:** `RUN useradd -r appuser` + `USER appuser`.

---

### SEC-031 — Papel armazenado em `localStorage` (controle de UI)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A01 Broken Access Control |
| **CWE** | [CWE-602](https://cwe.mitre.org/data/definitions/602.html) |

**Localização:** `frontend/src/lib/token.ts`, `RequireAuth.tsx`.

**Descrição:** `auth.role` vem do `localStorage` e controla rotas no React; API valida JWT no servidor (correto), mas UI pode ser enganada localmente.

**Impacto:** Baixo para API; confusão UX; não substitui falhas server-side.

**Recomendação:** Derivar papel apenas do payload JWT verificado ou endpoint `/auth/me`.

---

### SEC-032 — Decodificação JWT no cliente sem verificar assinatura

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A07 Authentication Failures |
| **CWE** | [CWE-347](https://cwe.mitre.org/data/definitions/347.html) |

**Localização:** `frontend/src/lib/token.ts`, `getUserIdFromToken()`.

**Descrição:** `atob` no payload sem validar assinatura — aceitável apenas para exibição; não deve autorizar ações críticas só no cliente.

**Impacto:** ID de usuário incorreto na UI se token adulterado (API ainda rejeita).

**Recomendação:** Endpoint `/auth/me` ou biblioteca que valide expiração no cliente para UX.

---

### SEC-033 — XSS armazenado (risco mitigado pelo React)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Baixa** |
| **OWASP** | A05 Injection |
| **CWE** | [CWE-79](https://cwe.mitre.org/data/definitions/79.html) |

**Localização:** Renderização de `comentario`, `conteudo`, `bio` em `HomePage.tsx`, `ChatPage.tsx`, `PublicProfilePage.tsx`.

**Descrição:** Conteúdo de usuário é interpolado em JSX (`{it.comentario}`), escapado por padrão. Não há `dangerouslySetInnerHTML`.

**Impacto:** Baixo com React atual; risco sobe se futuros rich-text ou HTML forem introduzidos.

**Recomendação:** Sanitizar no backend também; CSP `script-src 'self'`.

---

### SEC-034 — Postgres exposto na porta host

| Campo | Detalhe |
|-------|---------|
| **Severidade** | **Média** |
| **OWASP** | A02 Security Misconfiguration |
| **CWE** | [CWE-668](https://cwe.mitre.org/data/definitions/668.html) |

**Localização:** `docker-compose.yml`, linhas 9–10.

**Evidência:** `ports: - "5432:5432"` com senha em texto claro no compose.

**Impacto:** Acesso ao banco na rede local/host se firewall falhar.

**Recomendação:** Remover mapeamento de porta em produção; rede interna Docker apenas.

---

## Pontos positivos observados

- Senhas armazenadas com **bcrypt** (`User.verificar_senha`, `bcrypt.generate_password_hash`).
- Uso consistente de **SQLAlchemy ORM** para consultas (baixo risco de SQLi).
- Decoradores `@verificar_admin`, `@verificar_editor`, `@verificar_leitor` na maioria das rotas de negócio.
- Isolamento de livros por `editor_id` no blueprint editor.
- Testes de autorização por papel em `tests/test_security.py`.
- `.env` listado no `.gitignore`.
- Limite de upload `MAX_CONTENT_LENGTH` (5 MB).
- Nomes de arquivo de upload com **UUID** após `secure_filename`.
- React escapa conteúdo dinâmico por padrão (mitiga XSS armazenado).

---

## Plano de remediação sugerido (fases)

| Fase | Prazo sugerido | Itens |
|------|----------------|-------|
| **P0** | Imediato | SEC-002, SEC-001, SEC-020, SEC-004 |
| **P1** | 1–2 sprints | SEC-006, SEC-017, SEC-018, SEC-007, SEC-013, SEC-011 |
| **P2** | 2–4 sprints | SEC-003, SEC-005, SEC-022, SEC-029, SEC-015, SEC-027 |
| **P3** | Contínuo | SEC-028, SEC-030, SEC-033, hardening CSP, MFA admin |

---

## Referências gerais

- [OWASP Top 10:2025](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Flask Security Considerations](https://flask.palletsprojects.com/en/stable/security/)
- [JWT Best Current Practices (RFC 8725)](https://www.rfc-editor.org/rfc/rfc8725.html)

---

*Relatório gerado por revisão estática de código. Recomenda-se complementar com testes dinâmicos (DAST), varredura de dependências (`pip-audit`, `npm audit`) e pentest antes de produção.*
