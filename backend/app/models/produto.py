from app.extensions import db


class Produto(db.Model):
    __tablename__ = "produtos"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sku = db.Column(db.String(50), nullable=False, unique=True)
    nome = db.Column(db.String(180), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    unidade_medida = db.Column(db.String(20), nullable=False, default="UN")
    preco_custo = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    preco_venda = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    margem_lucro = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    estoque_atual = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    estoque_minimo = db.Column(db.Numeric(14, 3), nullable=False, default=0)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
        nullable=False,
    )
    