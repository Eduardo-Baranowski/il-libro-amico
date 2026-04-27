import os
import uuid
from flask import current_app, url_for
from werkzeug.utils import secure_filename


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


def image_url(rel_path: str | None):
    """
    Converte caminho relativo salvo no BD (ex.: 'books/abc.jpg') em URL pública.
    """
    if not rel_path:
        return None
    rel_path = rel_path.lstrip("/").replace("\\", "/")
    return url_for("static", filename=f"uploads/{rel_path}", _external=True)
