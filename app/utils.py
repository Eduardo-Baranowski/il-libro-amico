import os
import uuid
from functools import wraps
from flask import abort, url_for, current_app
from flask_login import current_user
from werkzeug.utils import secure_filename


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


def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def save_image(file, subfolder=""):
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Gerar nome único com UUID para evitar colisões
        ext = filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        
        upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
        os.makedirs(upload_path, exist_ok=True)
        
        file.save(os.path.join(upload_path, unique_filename))
        # Retornar o caminho relativo para guardar no BD
        return os.path.join(subfolder, unique_filename) if subfolder else unique_filename
    return None
