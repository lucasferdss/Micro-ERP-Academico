from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required

from app.extensions import db
from app.models.plano_conta import PlanoConta

plano_contas_bp = Blueprint("plano_contas", __name__)


TIPOS_CONTA = ["ATIVO", "PASSIVO", "PL", "RECEITA", "DESPESA"]
NATUREZAS = ["DEVEDORA", "CREDORA"]


@plano_contas_bp.route("/")
@login_required
def listar():
    contas = PlanoConta.query.order_by(PlanoConta.codigo.asc()).all()
    return render_template("plano_contas/list.html", contas=contas)


@plano_contas_bp.route("/novo", methods=["GET", "POST"])
@login_required
def novo():
    contas_pai = PlanoConta.query.order_by(PlanoConta.codigo.asc()).all()

    if request.method == "POST":
        codigo = request.form.get("codigo", "").strip()
        nome = request.form.get("nome", "").strip()
        tipo_conta = request.form.get("tipo_conta", "").strip()
        natureza = request.form.get("natureza", "").strip()
        conta_pai_id = request.form.get("conta_pai_id", "").strip()
        aceita_lancamento = request.form.get("aceita_lancamento") == "on"

        if not codigo:
            flash("Código é obrigatório.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=None,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if not nome:
            flash("Nome é obrigatório.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=None,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if tipo_conta not in TIPOS_CONTA:
            flash("Tipo de conta inválido.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=None,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if natureza not in NATUREZAS:
            flash("Natureza inválida.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=None,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        existente = PlanoConta.query.filter_by(codigo=codigo).first()
        if existente:
            flash("Já existe uma conta com esse código.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=None,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        conta_pai = None
        if conta_pai_id:
            conta_pai = PlanoConta.query.get(conta_pai_id)
            if not conta_pai:
                flash("Conta pai inválida.", "error")
                return render_template(
                    "plano_contas/form.html",
                    conta=None,
                    contas_pai=contas_pai,
                    tipos_conta=TIPOS_CONTA,
                    naturezas=NATUREZAS,
                )

        conta = PlanoConta(
            codigo=codigo,
            nome=nome,
            tipo_conta=tipo_conta,
            natureza=natureza,
            conta_pai_id=conta_pai.id if conta_pai else None,
            aceita_lancamento=aceita_lancamento,
            ativo=True,
        )

        db.session.add(conta)
        db.session.commit()

        flash("Conta cadastrada com sucesso.", "success")
        return redirect(url_for("plano_contas.listar"))

    return render_template(
        "plano_contas/form.html",
        conta=None,
        contas_pai=contas_pai,
        tipos_conta=TIPOS_CONTA,
        naturezas=NATUREZAS,
    )


@plano_contas_bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
def editar(id):
    conta = PlanoConta.query.get_or_404(id)
    contas_pai = PlanoConta.query.filter(PlanoConta.id != id).order_by(PlanoConta.codigo.asc()).all()

    if request.method == "POST":
        codigo = request.form.get("codigo", "").strip()
        nome = request.form.get("nome", "").strip()
        tipo_conta = request.form.get("tipo_conta", "").strip()
        natureza = request.form.get("natureza", "").strip()
        conta_pai_id = request.form.get("conta_pai_id", "").strip()
        aceita_lancamento = request.form.get("aceita_lancamento") == "on"

        if not codigo:
            flash("Código é obrigatório.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=conta,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if not nome:
            flash("Nome é obrigatório.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=conta,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if tipo_conta not in TIPOS_CONTA:
            flash("Tipo de conta inválido.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=conta,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        if natureza not in NATUREZAS:
            flash("Natureza inválida.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=conta,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        existente = PlanoConta.query.filter(
            PlanoConta.codigo == codigo,
            PlanoConta.id != conta.id
        ).first()

        if existente:
            flash("Já existe outra conta com esse código.", "error")
            return render_template(
                "plano_contas/form.html",
                conta=conta,
                contas_pai=contas_pai,
                tipos_conta=TIPOS_CONTA,
                naturezas=NATUREZAS,
            )

        nova_conta_pai_id = None
        if conta_pai_id:
            conta_pai = PlanoConta.query.get(conta_pai_id)
            if not conta_pai:
                flash("Conta pai inválida.", "error")
                return render_template(
                    "plano_contas/form.html",
                    conta=conta,
                    contas_pai=contas_pai,
                    tipos_conta=TIPOS_CONTA,
                    naturezas=NATUREZAS,
                )
            nova_conta_pai_id = conta_pai.id

        conta.codigo = codigo
        conta.nome = nome
        conta.tipo_conta = tipo_conta
        conta.natureza = natureza
        conta.conta_pai_id = nova_conta_pai_id
        conta.aceita_lancamento = aceita_lancamento

        db.session.commit()

        flash("Conta atualizada com sucesso.", "success")
        return redirect(url_for("plano_contas.listar"))

    return render_template(
        "plano_contas/form.html",
        conta=conta,
        contas_pai=contas_pai,
        tipos_conta=TIPOS_CONTA,
        naturezas=NATUREZAS,
    )


@plano_contas_bp.route("/<int:id>/toggle", methods=["POST"])
@login_required
def toggle_ativo(id):
    conta = PlanoConta.query.get_or_404(id)
    conta.ativo = not conta.ativo
    db.session.commit()

    if conta.ativo:
        flash("Conta ativada com sucesso.", "success")
    else:
        flash("Conta desativada com sucesso.", "success")

    return redirect(url_for("plano_contas.listar"))