from decimal import Decimal, InvalidOperation

from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from app.extensions import db
from app.models.produto import Produto

produtos_bp = Blueprint("produtos", __name__)


def parse_decimal(value: str, default: str = "0") -> Decimal:
    raw = (value or "").strip().replace(".", "").replace(",", ".")
    if not raw:
        raw = default
    return Decimal(raw)


def calcular_margem(preco_custo: Decimal, preco_venda: Decimal) -> Decimal:
    if preco_custo <= 0:
        return Decimal("0")
    return ((preco_venda - preco_custo) / preco_custo) * Decimal("100")


@produtos_bp.route("/")
@login_required
def listar():
    produtos = Produto.query.order_by(Produto.id.desc()).all()
    return render_template("produtos/list.html", produtos=produtos)


@produtos_bp.route("/novo", methods=["GET", "POST"])
@login_required
def novo():
    if request.method == "POST":
        try:
            sku = request.form.get("sku", "").strip()
            nome = request.form.get("nome", "").strip()
            descricao = request.form.get("descricao", "").strip() or None
            unidade_medida = request.form.get("unidade_medida", "").strip() or "UN"

            preco_custo = parse_decimal(request.form.get("preco_custo", "0"))
            preco_venda = parse_decimal(request.form.get("preco_venda", "0"))
            estoque_atual = parse_decimal(request.form.get("estoque_atual", "0"))
            estoque_minimo = parse_decimal(request.form.get("estoque_minimo", "0"))
        except InvalidOperation:
            flash("Valores numéricos inválidos.", "error")
            return render_template("produtos/form.html", produto=None)

        if not sku:
            flash("SKU é obrigatório.", "error")
            return render_template("produtos/form.html", produto=None)

        if not nome:
            flash("Nome do produto é obrigatório.", "error")
            return render_template("produtos/form.html", produto=None)

        if preco_custo < 0 or preco_venda < 0 or estoque_atual < 0 or estoque_minimo < 0:
            flash("Preço e estoque não podem ser negativos.", "error")
            return render_template("produtos/form.html", produto=None)

        existente = Produto.query.filter_by(sku=sku).first()
        if existente:
            flash("Já existe um produto com esse SKU.", "error")
            return render_template("produtos/form.html", produto=None)

        margem_lucro = calcular_margem(preco_custo, preco_venda)

        produto = Produto(
            sku=sku,
            nome=nome,
            descricao=descricao,
            unidade_medida=unidade_medida,
            preco_custo=preco_custo,
            preco_venda=preco_venda,
            margem_lucro=margem_lucro,
            estoque_atual=estoque_atual,
            estoque_minimo=estoque_minimo,
            ativo=True,
        )

        db.session.add(produto)
        db.session.commit()

        flash("Produto cadastrado com sucesso.", "success")
        return redirect(url_for("produtos.listar"))

    return render_template("produtos/form.html", produto=None)


@produtos_bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
def editar(id):
    produto = Produto.query.get_or_404(id)

    if request.method == "POST":
        try:
            sku = request.form.get("sku", "").strip()
            nome = request.form.get("nome", "").strip()
            descricao = request.form.get("descricao", "").strip() or None
            unidade_medida = request.form.get("unidade_medida", "").strip() or "UN"

            preco_custo = parse_decimal(request.form.get("preco_custo", "0"))
            preco_venda = parse_decimal(request.form.get("preco_venda", "0"))
            estoque_atual = parse_decimal(request.form.get("estoque_atual", "0"))
            estoque_minimo = parse_decimal(request.form.get("estoque_minimo", "0"))
        except InvalidOperation:
            flash("Valores numéricos inválidos.", "error")
            return render_template("produtos/form.html", produto=produto)

        if not sku:
            flash("SKU é obrigatório.", "error")
            return render_template("produtos/form.html", produto=produto)

        if not nome:
            flash("Nome do produto é obrigatório.", "error")
            return render_template("produtos/form.html", produto=produto)

        if preco_custo < 0 or preco_venda < 0 or estoque_atual < 0 or estoque_minimo < 0:
            flash("Preço e estoque não podem ser negativos.", "error")
            return render_template("produtos/form.html", produto=produto)

        existente = Produto.query.filter(
            Produto.sku == sku,
            Produto.id != produto.id
        ).first()

        if existente:
            flash("Já existe outro produto com esse SKU.", "error")
            return render_template("produtos/form.html", produto=produto)

        produto.sku = sku
        produto.nome = nome
        produto.descricao = descricao
        produto.unidade_medida = unidade_medida
        produto.preco_custo = preco_custo
        produto.preco_venda = preco_venda
        produto.margem_lucro = calcular_margem(preco_custo, preco_venda)
        produto.estoque_atual = estoque_atual
        produto.estoque_minimo = estoque_minimo

        db.session.commit()

        flash("Produto atualizado com sucesso.", "success")
        return redirect(url_for("produtos.listar"))

    return render_template("produtos/form.html", produto=produto)


@produtos_bp.route("/<int:id>/toggle", methods=["POST"])
@login_required
def toggle_ativo(id):
    produto = Produto.query.get_or_404(id)
    produto.ativo = not produto.ativo
    db.session.commit()

    if produto.ativo:
        flash("Produto ativado com sucesso.", "success")
    else:
        flash("Produto desativado com sucesso.", "success")

    return redirect(url_for("produtos.listar"))