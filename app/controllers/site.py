from decimal import Decimal, InvalidOperation

from flask import Blueprint, render_template, request, redirect, url_for, flash, abort
from flask_login import login_user, logout_user, login_required, current_user

from .. import db, bcrypt
from ..models.user import User
from ..models.request import Request
from ..models.livro import Livro
from ..utils import papel_requerido, url_painel_por_papel, save_image

site_bp = Blueprint("site", __name__)


@site_bp.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_painel_por_papel())
    return render_template("index.html")


@site_bp.route("/entrar", methods=["GET", "POST"])
def entrar():
    if current_user.is_authenticated:
        return redirect(url_painel_por_papel())

    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        senha = request.form.get("senha") or ""
        usuario = User.query.filter_by(email=email).first()
        if usuario and usuario.verificar_senha(senha):
            login_user(usuario, remember=True)
            nxt = request.args.get("next") or ""
            if nxt.startswith("/") and not nxt.startswith("//"):
                return redirect(nxt)
            return redirect(url_painel_por_papel())
        flash("Email ou senha inválidos.", "danger")

    return render_template("entrar.html")


@site_bp.route("/sair")
@login_required
def sair():
    logout_user()
    flash("Sessão encerrada.", "info")
    return redirect(url_for("site.index"))


@site_bp.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if current_user.is_authenticated:
        return redirect(url_painel_por_papel())

    if request.method == "POST":
        nome = (request.form.get("nome") or "").strip()
        email = (request.form.get("email") or "").strip()
        senha = request.form.get("senha") or ""
        file = request.files.get("imagem")
        
        if not nome or not email or not senha:
            flash("Preencha nome, email e senha.", "warning")
        elif User.query.filter_by(email=email).first():
            flash("Este email já está cadastrado.", "warning")
        else:
            imagem_path = save_image(file, "users")
            u = User(
                nome=nome,
                email=email,
                senha_hash=bcrypt.generate_password_hash(senha).decode("utf-8"),
                papel="leitor",
                imagem=imagem_path
            )
            db.session.add(u)
            db.session.commit()
            login_user(u, remember=True)
            flash("Conta criada com sucesso.", "success")
            return redirect(url_for("site.painel_leitor"))

    return render_template("cadastro.html")


@site_bp.route("/painel-leitor")
@login_required
@papel_requerido("leitor")
def painel_leitor():
    solicitacoes = (
        Request.query.filter_by(leitor_id=current_user.id).order_by(Request.data_criacao.desc()).all()
    )
    return render_template("leitor/painel.html", solicitacoes=solicitacoes)


@site_bp.route("/painel-leitor/solicitar", methods=["GET", "POST"])
@login_required
@papel_requerido("leitor")
def nova_solicitacao():
    editoras = User.query.filter_by(papel="editor").order_by(User.nome).all()
    if request.method == "POST":
        try:
            editor_id = int(request.form.get("editor_id") or "0")
        except ValueError:
            editor_id = 0
        conteudo = (request.form.get("conteudo") or "").strip()
        if not editor_id or not conteudo:
            flash("Escolha uma editora e descreva a solicitação.", "warning")
        elif not User.query.filter_by(id=editor_id, papel="editor").first():
            flash("Editora inválida.", "danger")
        else:
            s = Request(
                leitor_id=current_user.id,
                editor_id=editor_id,
                conteudo=conteudo,
                status="pendente",
            )
            db.session.add(s)
            db.session.commit()
            flash("Solicitação enviada.", "success")
            return redirect(url_for("site.painel_leitor"))

    return render_template("leitor/solicitar.html", editoras=editoras)


@site_bp.route("/painel-editor")
@login_required
@papel_requerido("editor")
def painel_editor():
    solicitacoes = (
        Request.query.filter_by(editor_id=current_user.id).order_by(Request.data_criacao.desc()).all()
    )
    livros = Livro.query.filter_by(editor_id=current_user.id).order_by(Livro.data_cadastro.desc()).all()
    return render_template("editor/painel.html", solicitacoes=solicitacoes, livros=livros)


@site_bp.route("/painel-editor/solicitacoes/<int:sid>", methods=["GET", "POST"])
@login_required
@papel_requerido("editor")
def responder_solicitacao(sid):
    sol = Request.query.filter_by(id=sid, editor_id=current_user.id).first_or_404()
    if request.method == "POST":
        if sol.status == "respondida":
            flash("Esta solicitação já foi respondida.", "warning")
        else:
            resposta = (request.form.get("resposta") or "").strip()
            if not resposta:
                flash("Escreva a resposta.", "warning")
            else:
                sol.resposta = resposta
                sol.status = "respondida"
                db.session.commit()
                flash("Resposta registada.", "success")
                return redirect(url_for("site.painel_editor"))

    return render_template("editor/responder.html", sol=sol)


@site_bp.route("/painel-editor/livros/novo", methods=["GET", "POST"])
@site_bp.route("/painel-editor/livros/<int:lid>/editar", methods=["GET", "POST"])
@login_required
@papel_requerido("editor")
def livro_form(lid=None):
    livro = Livro.query.filter_by(id=lid, editor_id=current_user.id).first() if lid else None
    if lid and not livro:
        abort(404)

    if request.method == "POST":
        titulo = (request.form.get("titulo") or "").strip()
        autor = (request.form.get("autor") or "").strip()
        descricao = (request.form.get("descricao") or "").strip() or None
        preco_raw = (request.form.get("preco") or "").strip().replace(",", ".")
        file = request.files.get("imagem")
        
        try:
            preco = Decimal(preco_raw)
        except (InvalidOperation, TypeError):
            preco = None
        if not titulo or not autor or preco is None or preco < 0:
            flash("Título, autor e preço válido são obrigatórios.", "warning")
        else:
            if livro is None:
                livro = Livro(editor_id=current_user.id)
                db.session.add(livro)
            
            imagem_path = save_image(file, "books")
            if imagem_path:
                livro.imagem = imagem_path
                
            livro.titulo = titulo
            livro.autor = autor
            livro.descricao = descricao
            livro.preco = preco
            db.session.commit()
            flash("Livro guardado.", "success")
            return redirect(url_for("site.painel_editor"))

    return render_template("editor/livro_form.html", livro=livro)


@site_bp.route("/painel-editor/livros/<int:lid>/excluir", methods=["POST"])
@login_required
@papel_requerido("editor")
def livro_excluir(lid):
    livro = Livro.query.filter_by(id=lid, editor_id=current_user.id).first_or_404()
    db.session.delete(livro)
    db.session.commit()
    flash("Livro removido.", "info")
    return redirect(url_for("site.painel_editor"))


@site_bp.route("/painel-admin")
@login_required
@papel_requerido("admin")
def painel_admin():
    return render_template("admin/painel.html")


@site_bp.route("/painel-admin/usuarios")
@login_required
@papel_requerido("admin")
def admin_usuarios():
    usuarios = User.query.order_by(User.papel, User.nome).all()
    return render_template("admin/usuarios.html", usuarios=usuarios)


@site_bp.route("/painel-admin/usuarios/novo", methods=["GET", "POST"])
@site_bp.route("/painel-admin/usuarios/<int:uid>/editar", methods=["GET", "POST"])
@login_required
@papel_requerido("admin")
def admin_usuario_form(uid=None):
    usuario = User.query.get(uid) if uid else None
    if uid and not usuario:
        abort(404)

    if request.method == "POST":
        nome = (request.form.get("nome") or "").strip()
        email = (request.form.get("email") or "").strip()
        papel = (request.form.get("papel") or "").strip()
        senha = request.form.get("senha") or ""
        file = request.files.get("imagem")

        if papel not in ("admin", "editor", "leitor"):
            flash("Papel inválido.", "danger")
            return render_template("admin/usuario_form.html", usuario=usuario, editando=bool(uid))

        existente = User.query.filter(User.email == email, User.id != (usuario.id if usuario else -1)).first()
        if existente:
            flash("Este email já está em uso.", "warning")
            return render_template("admin/usuario_form.html", usuario=usuario, editando=bool(uid))

        if not nome or not email:
            flash("Nome e email são obrigatórios.", "warning")
            return render_template("admin/usuario_form.html", usuario=usuario, editando=bool(uid))

        imagem_path = save_image(file, "users")

        if usuario is None:
            if not senha:
                flash("Defina uma senha para o novo utilizador.", "warning")
                return render_template("admin/usuario_form.html", usuario=None, editando=False)
            usuario = User(
                nome=nome,
                email=email,
                senha_hash=bcrypt.generate_password_hash(senha).decode("utf-8"),
                papel=papel,
                imagem=imagem_path
            )
            db.session.add(usuario)
        else:
            usuario.nome = nome
            usuario.email = email
            usuario.papel = papel
            if imagem_path:
                usuario.imagem = imagem_path
            if senha:
                usuario.senha_hash = bcrypt.generate_password_hash(senha).decode("utf-8")

        db.session.commit()
        flash("Utilizador guardado.", "success")
        return redirect(url_for("site.admin_usuarios"))

    return render_template("admin/usuario_form.html", usuario=usuario, editando=bool(uid))


@site_bp.route("/painel-admin/usuarios/<int:uid>/excluir", methods=["POST"])
@login_required
@papel_requerido("admin")
def admin_usuario_excluir(uid):
    alvo = User.query.get_or_404(uid)
    if alvo.id == current_user.id:
        flash("Não pode eliminar a sua própria conta.", "danger")
        return redirect(url_for("site.admin_usuarios"))
    if alvo.papel == "admin":
        outros = User.query.filter(User.papel == "admin", User.id != alvo.id).count()
        if outros == 0:
            flash("Deve existir pelo menos um administrador.", "danger")
            return redirect(url_for("site.admin_usuarios"))
    db.session.delete(alvo)
    db.session.commit()
    flash("Utilizador eliminado.", "info")
    return redirect(url_for("site.admin_usuarios"))


@site_bp.route("/painel-admin/relatorios")
@login_required
@papel_requerido("admin")
def admin_relatorios():
    total_usuarios = User.query.count()
    usuarios_por_papel = db.session.query(User.papel, db.func.count(User.id)).group_by(User.papel).all()
    solicitacoes_por_status = (
        db.session.query(Request.status, db.func.count(Request.id)).group_by(Request.status).all()
    )
    total_livros = Livro.query.count()
    return render_template(
        "admin/relatorios.html",
        total_usuarios=total_usuarios,
        usuarios_por_papel=dict(usuarios_por_papel),
        solicitacoes_por_status=dict(solicitacoes_por_status),
        total_livros=total_livros,
    )
