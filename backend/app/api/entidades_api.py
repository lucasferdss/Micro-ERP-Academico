from flask import Blueprint, jsonify, request
from flask_login import login_required

from app.extensions import db
from app.models.entidade import Entidade

entidades_api_bp = Blueprint("entidades_api", __name__)


def entidade_to_dict(entidade: Entidade) -> dict:
    return {
        "id": entidade.id,
        "tipo_entidade": entidade.tipo_entidade,
        "nome_razao_social": entidade.nome_razao_social,
        "nome_fantasia": entidade.nome_fantasia,
        "cpf_cnpj": entidade.cpf_cnpj,
        "inscricao_estadual": entidade.inscricao_estadual,
        "email": entidade.email,
        "telefone": entidade.telefone,
        "cep": entidade.cep,
        "logradouro": entidade.logradouro,
        "numero": entidade.numero,
        "bairro": entidade.bairro,
        "cidade": entidade.cidade,
        "uf": entidade.uf,
        "ativo": entidade.ativo,
        "created_at": entidade.created_at.isoformat() if entidade.created_at else None,
        "updated_at": entidade.updated_at.isoformat() if entidade.updated_at else None,
    }


def extrair_dados_entidade(data: dict):
    return {
        "tipo_entidade": (data.get("tipo_entidade") or "").strip(),
        "nome_razao_social": (data.get("nome_razao_social") or "").strip(),
        "nome_fantasia": (data.get("nome_fantasia") or "").strip() or None,
        "cpf_cnpj": (data.get("cpf_cnpj") or "").strip(),
        "inscricao_estadual": (data.get("inscricao_estadual") or "").strip() or None,
        "email": (data.get("email") or "").strip() or None,
        "telefone": (data.get("telefone") or "").strip() or None,
        "cep": (data.get("cep") or "").strip() or None,
        "logradouro": (data.get("logradouro") or "").strip() or None,
        "numero": (data.get("numero") or "").strip() or None,
        "bairro": (data.get("bairro") or "").strip() or None,
        "cidade": (data.get("cidade") or "").strip() or None,
        "uf": (data.get("uf") or "").strip() or None,
    }


def validar_entidade(campos: dict, entidade_id: int | None = None):
    if campos["tipo_entidade"] not in ["CLIENTE", "FORNECEDOR"]:
        return "Tipo de entidade inválido."

    if not campos["nome_razao_social"]:
        return "Nome/Razão Social é obrigatório."

    if not campos["cpf_cnpj"]:
        return "CPF/CNPJ é obrigatório."

    existente = Entidade.query.filter_by(cpf_cnpj=campos["cpf_cnpj"]).first()
    if existente and existente.id != entidade_id:
        return "Já existe uma entidade com esse CPF/CNPJ."

    return None


@entidades_api_bp.route("/api/entidades", methods=["GET"])
@login_required
def listar_entidades():
    entidades = Entidade.query.order_by(Entidade.id.desc()).all()
    return jsonify([entidade_to_dict(entidade) for entidade in entidades])


@entidades_api_bp.route("/api/entidades", methods=["POST"])
@login_required
def criar_entidade():
    data = request.get_json(silent=True) or {}
    campos = extrair_dados_entidade(data)

    erro = validar_entidade(campos)
    if erro:
        status = 409 if "CPF/CNPJ" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    entidade = Entidade(**campos, ativo=True)
    db.session.add(entidade)
    db.session.commit()

    return jsonify(entidade_to_dict(entidade)), 201


@entidades_api_bp.route("/api/entidades/<int:id>", methods=["PUT"])
@login_required
def atualizar_entidade(id):
    entidade = Entidade.query.get_or_404(id)

    data = request.get_json(silent=True) or {}
    campos = extrair_dados_entidade(data)

    erro = validar_entidade(campos, entidade_id=entidade.id)
    if erro:
        status = 409 if "CPF/CNPJ" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    for chave, valor in campos.items():
        setattr(entidade, chave, valor)

    db.session.commit()
    return jsonify(entidade_to_dict(entidade))


@entidades_api_bp.route("/api/entidades/<int:id>/toggle", methods=["PATCH"])
@login_required
def toggle_entidade(id):
    entidade = Entidade.query.get_or_404(id)
    entidade.ativo = not entidade.ativo
    db.session.commit()
    return jsonify(entidade_to_dict(entidade))