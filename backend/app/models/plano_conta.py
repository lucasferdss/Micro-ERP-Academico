from app.extensions import db


class PlanoConta(db.Model):
    __tablename__ = "plano_contas"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    codigo = db.Column(db.String(30), nullable=False, unique=True)
    nome = db.Column(db.String(180), nullable=False)
    tipo_conta = db.Column(db.String(20), nullable=False)  # ATIVO, PASSIVO, PL, RECEITA, DESPESA
    natureza = db.Column(db.String(20), nullable=False)    # DEVEDORA, CREDORA
    conta_pai_id = db.Column(db.Integer, db.ForeignKey("plano_contas.id"), nullable=True)
    aceita_lancamento = db.Column(db.Boolean, nullable=False, default=True)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now(),
        nullable=False,
    )

    conta_pai = db.relationship(
        "PlanoConta",
        remote_side=[id],
        backref="filhas",
        lazy=True,
    )
    