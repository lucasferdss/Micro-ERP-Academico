from flask import Blueprint, jsonify, request
from flask_login import login_required

from app.extensions import db
from app.models.plano_conta import PlanoConta

plano_contas_api_bp = Blueprint("plano_contas_api", __name__)

TIPOS_CONTA = ["ATIVO", "PASSIVO", "PL", "RECEITA", "DESPESA"]
NATUREZAS = ["DEVEDORA", "CREDORA"]


def conta_to_dict(conta: PlanoConta) -> dict:
    return {
        "id": conta.id,
        "codigo": conta.codigo,
        "nome": conta.nome,
        "tipo_conta": conta.tipo_conta,
        "natureza": conta.natureza,
        "conta_pai_id": conta.conta_pai_id,
        "conta_pai": (
            {
                "id": conta.conta_pai.id,
                "codigo": conta.conta_pai.codigo,
                "nome": conta.conta_pai.nome,
            }
            if conta.conta_pai
            else None
        ),
        "aceita_lancamento": conta.aceita_lancamento,
        "ativo": conta.ativo,
        "created_at": conta.created_at.isoformat() if conta.created_at else None,
        "updated_at": conta.updated_at.isoformat() if conta.updated_at else None,
    }


def validar_campos(codigo, nome, tipo_conta, natureza, conta_pai_id, conta_id=None):
    if not codigo:
        return "Código é obrigatório."

    if not nome:
        return "Nome é obrigatório."

    if tipo_conta not in TIPOS_CONTA:
        return "Tipo de conta inválido."

    if natureza not in NATUREZAS:
        return "Natureza inválida."

    existente = PlanoConta.query.filter_by(codigo=codigo).first()
    if existente and existente.id != conta_id:
        return "Já existe uma conta com esse código."

    if conta_pai_id not in [None, "", 0, "0"]:
        conta_pai = PlanoConta.query.get(conta_pai_id)
        if not conta_pai:
            return "Conta pai inválida."
        if conta_id and conta_pai.id == conta_id:
            return "Uma conta não pode ser pai dela mesma."

    return None


@plano_contas_api_bp.route("/api/plano-contas", methods=["GET"])
@login_required
def listar_plano_contas():
    contas = PlanoConta.query.order_by(PlanoConta.codigo.asc()).all()
    return jsonify([conta_to_dict(conta) for conta in contas])


@plano_contas_api_bp.route("/api/plano-contas", methods=["POST"])
@login_required
def criar_plano_conta():
    data = request.get_json(silent=True) or {}

    codigo = (data.get("codigo") or "").strip()
    nome = (data.get("nome") or "").strip()
    tipo_conta = (data.get("tipo_conta") or "").strip()
    natureza = (data.get("natureza") or "").strip()
    conta_pai_id = data.get("conta_pai_id")
    aceita_lancamento = bool(data.get("aceita_lancamento", True))

    erro = validar_campos(codigo, nome, tipo_conta, natureza, conta_pai_id)
    if erro:
        status = 409 if "código" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    conta = PlanoConta(
        codigo=codigo,
        nome=nome,
        tipo_conta=tipo_conta,
        natureza=natureza,
        conta_pai_id=conta_pai_id if conta_pai_id not in [None, "", 0, "0"] else None,
        aceita_lancamento=aceita_lancamento,
        ativo=True,
    )

    db.session.add(conta)
    db.session.commit()

    return jsonify(conta_to_dict(conta)), 201


@plano_contas_api_bp.route("/api/plano-contas/<int:id>", methods=["PUT"])
@login_required
def atualizar_plano_conta(id):
    conta = PlanoConta.query.get_or_404(id)
    data = request.get_json(silent=True) or {}

    codigo = (data.get("codigo") or "").strip()
    nome = (data.get("nome") or "").strip()
    tipo_conta = (data.get("tipo_conta") or "").strip()
    natureza = (data.get("natureza") or "").strip()
    conta_pai_id = data.get("conta_pai_id")
    aceita_lancamento = bool(data.get("aceita_lancamento", True))

    erro = validar_campos(codigo, nome, tipo_conta, natureza, conta_pai_id, conta_id=conta.id)
    if erro:
        status = 409 if "código" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    conta.codigo = codigo
    conta.nome = nome
    conta.tipo_conta = tipo_conta
    conta.natureza = natureza
    conta.conta_pai_id = conta_pai_id if conta_pai_id not in [None, "", 0, "0"] else None
    conta.aceita_lancamento = aceita_lancamento

    db.session.commit()
    return jsonify(conta_to_dict(conta))


@plano_contas_api_bp.route("/api/plano-contas/<int:id>/toggle", methods=["PATCH"])
@login_required
def toggle_plano_conta(id):
    conta = PlanoConta.query.get_or_404(id)
    conta.ativo = not conta.ativo
    db.session.commit()
    return jsonify(conta_to_dict(conta))