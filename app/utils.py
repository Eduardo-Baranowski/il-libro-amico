from functools import wraps
from flask import abort, url_for
from flask_login import current_user


def url_painel_por_papel():
    if not current_user.is_authenticated:
        return url_for("site.entrar")
    p = current_user.papel
    if p == "admin":
        return url_for("site.painel_admin")
    if p == "editor":
        return url_for("site.painel_editor")
    return url_for("site.painel_leitor")


def papel_requerido(*papeis):
    def decorator(view_fn):
        @wraps(view_fn)
        def wrapped(*args, **kwargs):
            if current_user.papel not in papeis:
                abort(403)
            return view_fn(*args, **kwargs)

        return wrapped

    return decorator
