from app.extensions import db


class Entidade(db.Model):
    __tablename__ = "entidades"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tipo_entidade = db.Column(db.String(20), nullable=False)  # CLIENTE ou FORNECEDOR
    nome_razao_social = db.Column(db.String(180), nullable=False)
    nome_fantasia = db.Column(db.String(180), nullable=True)
    cpf_cnpj = db.Column(db.String(20), nullable=False, unique=True)
    inscricao_estadual = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    telefone = db.Column(db.String(30), nullable=True)
    cep = db.Column(db.String(12), nullable=True)
    logradouro = db.Column(db.String(180), nullable=True)
    numero = db.Column(db.String(20), nullable=True)
    bairro = db.Column(db.String(100), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    uf = db.Column(db.String(2), nullable=True)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
        nullable=False,
    )
    