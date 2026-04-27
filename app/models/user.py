from .. import db, bcrypt


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    papel = db.Column(db.String(20), nullable=False) # 'admin', 'editor', 'leitor'
    imagem = db.Column(db.String(255), nullable=True)

    def verificar_senha(self, senha_plana):
        return bcrypt.check_password_hash(self.senha_hash, senha_plana)
