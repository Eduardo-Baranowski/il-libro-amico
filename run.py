import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app, db, bcrypt
from app.models.user import User

app = create_app()

def criar_admin_inicial():
    admin_email = os.environ.get("ADMIN_INITIAL_EMAIL")
    admin_senha = os.environ.get("ADMIN_INITIAL_PASSWORD")

    if not admin_email or not admin_senha:
        print("Erro: ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD devem ser definidos.")
        return

    with app.app_context():
        admin_existe = User.query.filter_by(email=admin_email).first()
        if not admin_existe:
            senha_hash = bcrypt.generate_password_hash(admin_senha).decode("utf-8")
            novo_admin = User(
                nome="Administrador Master",
                email=admin_email,
                senha_hash=senha_hash,
                papel="admin",
            )
            db.session.add(novo_admin)
            db.session.commit()
            print("Admin inicial criado com sucesso.")
        else:
            print("Admin inicial já existe.")

if __name__ == "__main__":
    criar_admin_inicial()
    debug = os.environ.get("FLASK_DEBUG", "1") not in ("0", "false", "False")
    app.run(debug=debug, host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
