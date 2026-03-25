from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_login import login_required

from app.extensions import db
from app.models.produto import Produto

produtos_api_bp = Blueprint("produtos_api", __name__)


def produto_to_dict(produto: Produto) -> dict:
    return {
        "id": produto.id,
        "sku": produto.sku,
        "nome": produto.nome,
        "descricao": produto.descricao,
        "unidade_medida": produto.unidade_medida,
        "preco_custo": float(produto.preco_custo) if produto.preco_custo is not None else 0,
        "preco_venda": float(produto.preco_venda) if produto.preco_venda is not None else 0,
        "margem_lucro": float(produto.margem_lucro) if produto.margem_lucro is not None else 0,
        "estoque_atual": float(produto.estoque_atual) if produto.estoque_atual is not None else 0,
        "estoque_minimo": float(produto.estoque_minimo) if produto.estoque_minimo is not None else 0,
        "ativo": produto.ativo,
        "created_at": produto.created_at.isoformat() if produto.created_at else None,
        "updated_at": produto.updated_at.isoformat() if produto.updated_at else None,
    }


def parse_decimal(value: str, default: str = "0") -> Decimal:
    raw = (value or "").strip().replace(".", "").replace(",", ".")
    if not raw:
        raw = default
    return Decimal(raw)


def calcular_margem(preco_custo: Decimal, preco_venda: Decimal) -> Decimal:
    if preco_custo <= 0:
        return Decimal("0")
    return ((preco_venda - preco_custo) / preco_custo) * Decimal("100")


def extrair_campos(data: dict):
    try:
        return {
            "sku": (data.get("sku") or "").strip(),
            "nome": (data.get("nome") or "").strip(),
            "descricao": (data.get("descricao") or "").strip() or None,
            "unidade_medida": (data.get("unidade_medida") or "").strip() or "UN",
            "preco_custo": parse_decimal(str(data.get("preco_custo", "0"))),
            "preco_venda": parse_decimal(str(data.get("preco_venda", "0"))),
            "estoque_atual": parse_decimal(str(data.get("estoque_atual", "0"))),
            "estoque_minimo": parse_decimal(str(data.get("estoque_minimo", "0"))),
        }, None
    except InvalidOperation:
        return None, "Valores numéricos inválidos."


def validar_campos(campos: dict, produto_id: int | None = None):
    if not campos["sku"]:
        return "SKU é obrigatório."

    if not campos["nome"]:
        return "Nome do produto é obrigatório."

    if (
        campos["preco_custo"] < 0
        or campos["preco_venda"] < 0
        or campos["estoque_atual"] < 0
        or campos["estoque_minimo"] < 0
    ):
        return "Preço e estoque não podem ser negativos."

    existente = Produto.query.filter_by(sku=campos["sku"]).first()
    if existente and existente.id != produto_id:
        return "Já existe um produto com esse SKU."

    return None


@produtos_api_bp.route("/api/produtos", methods=["GET"])
@login_required
def listar_produtos():
    produtos = Produto.query.order_by(Produto.id.desc()).all()
    return jsonify([produto_to_dict(produto) for produto in produtos])


@produtos_api_bp.route("/api/produtos", methods=["POST"])
@login_required
def criar_produto():
    data = request.get_json(silent=True) or {}
    campos, erro = extrair_campos(data)

    if erro:
        return jsonify({"error": erro}), 400

    erro = validar_campos(campos)
    if erro:
        status = 409 if "SKU" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    produto = Produto(
        sku=campos["sku"],
        nome=campos["nome"],
        descricao=campos["descricao"],
        unidade_medida=campos["unidade_medida"],
        preco_custo=campos["preco_custo"],
        preco_venda=campos["preco_venda"],
        margem_lucro=calcular_margem(campos["preco_custo"], campos["preco_venda"]),
        estoque_atual=campos["estoque_atual"],
        estoque_minimo=campos["estoque_minimo"],
        ativo=True,
    )

    db.session.add(produto)
    db.session.commit()

    return jsonify(produto_to_dict(produto)), 201


@produtos_api_bp.route("/api/produtos/<int:id>", methods=["PUT"])
@login_required
def atualizar_produto(id):
    produto = Produto.query.get_or_404(id)

    data = request.get_json(silent=True) or {}
    campos, erro = extrair_campos(data)

    if erro:
        return jsonify({"error": erro}), 400

    erro = validar_campos(campos, produto_id=produto.id)
    if erro:
        status = 409 if "SKU" in erro and "existe" in erro else 400
        return jsonify({"error": erro}), status

    produto.sku = campos["sku"]
    produto.nome = campos["nome"]
    produto.descricao = campos["descricao"]
    produto.unidade_medida = campos["unidade_medida"]
    produto.preco_custo = campos["preco_custo"]
    produto.preco_venda = campos["preco_venda"]
    produto.margem_lucro = calcular_margem(campos["preco_custo"], campos["preco_venda"])
    produto.estoque_atual = campos["estoque_atual"]
    produto.estoque_minimo = campos["estoque_minimo"]

    db.session.commit()
    return jsonify(produto_to_dict(produto))


@produtos_api_bp.route("/api/produtos/<int:id>/toggle", methods=["PATCH"])
@login_required
def toggle_produto(id):
    produto = Produto.query.get_or_404(id)
    produto.ativo = not produto.ativo
    db.session.commit()
    return jsonify(produto_to_dict(produto))