from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required
from app.extensions import db
from app.models.entidade import Entidade

entidades_bp = Blueprint("entidades", __name__)


@entidades_bp.route("/")
@login_required
def listar():
    entidades = Entidade.query.order_by(Entidade.id.desc()).all()
    return render_template("entidades/list.html", entidades=entidades)


@entidades_bp.route("/novo", methods=["GET", "POST"])
@login_required
def novo():
    if request.method == "POST":
        tipo_entidade = request.form.get("tipo_entidade", "").strip()
        nome_razao_social = request.form.get("nome_razao_social", "").strip()
        nome_fantasia = request.form.get("nome_fantasia", "").strip() or None
        cpf_cnpj = request.form.get("cpf_cnpj", "").strip()
        inscricao_estadual = request.form.get("inscricao_estadual", "").strip() or None
        email = request.form.get("email", "").strip() or None
        telefone = request.form.get("telefone", "").strip() or None
        cep = request.form.get("cep", "").strip() or None
        logradouro = request.form.get("logradouro", "").strip() or None
        numero = request.form.get("numero", "").strip() or None
        bairro = request.form.get("bairro", "").strip() or None
        cidade = request.form.get("cidade", "").strip() or None
        uf = request.form.get("uf", "").strip() or None

        if tipo_entidade not in ["CLIENTE", "FORNECEDOR"]:
            flash("Tipo de entidade inválido.", "error")
            return render_template("entidades/form.html", entidade=None)

        if not nome_razao_social:
            flash("Nome/Razão Social é obrigatório.", "error")
            return render_template("entidades/form.html", entidade=None)

        if not cpf_cnpj:
            flash("CPF/CNPJ é obrigatório.", "error")
            return render_template("entidades/form.html", entidade=None)

        existente = Entidade.query.filter_by(cpf_cnpj=cpf_cnpj).first()
        if existente:
            flash("Já existe uma entidade com esse CPF/CNPJ.", "error")
            return render_template("entidades/form.html", entidade=None)

        entidade = Entidade(
            tipo_entidade=tipo_entidade,
            nome_razao_social=nome_razao_social,
            nome_fantasia=nome_fantasia,
            cpf_cnpj=cpf_cnpj,
            inscricao_estadual=inscricao_estadual,
            email=email,
            telefone=telefone,
            cep=cep,
            logradouro=logradouro,
            numero=numero,
            bairro=bairro,
            cidade=cidade,
            uf=uf,
            ativo=True,
        )

        db.session.add(entidade)
        db.session.commit()

        flash("Entidade cadastrada com sucesso.", "success")
        return redirect(url_for("entidades.listar"))

    return render_template("entidades/form.html", entidade=None)


@entidades_bp.route("/<int:id>/editar", methods=["GET", "POST"])
@login_required
def editar(id):
    entidade = Entidade.query.get_or_404(id)

    if request.method == "POST":
        tipo_entidade = request.form.get("tipo_entidade", "").strip()
        nome_razao_social = request.form.get("nome_razao_social", "").strip()
        nome_fantasia = request.form.get("nome_fantasia", "").strip() or None
        cpf_cnpj = request.form.get("cpf_cnpj", "").strip()
        inscricao_estadual = request.form.get("inscricao_estadual", "").strip() or None
        email = request.form.get("email", "").strip() or None
        telefone = request.form.get("telefone", "").strip() or None
        cep = request.form.get("cep", "").strip() or None
        logradouro = request.form.get("logradouro", "").strip() or None
        numero = request.form.get("numero", "").strip() or None
        bairro = request.form.get("bairro", "").strip() or None
        cidade = request.form.get("cidade", "").strip() or None
        uf = request.form.get("uf", "").strip() or None

        if tipo_entidade not in ["CLIENTE", "FORNECEDOR"]:
            flash("Tipo de entidade inválido.", "error")
            return render_template("entidades/form.html", entidade=entidade)

        if not nome_razao_social:
            flash("Nome/Razão Social é obrigatório.", "error")
            return render_template("entidades/form.html", entidade=entidade)

        if not cpf_cnpj:
            flash("CPF/CNPJ é obrigatório.", "error")
            return render_template("entidades/form.html", entidade=entidade)

        existente = Entidade.query.filter(
            Entidade.cpf_cnpj == cpf_cnpj,
            Entidade.id != entidade.id
        ).first()

        if existente:
            flash("Já existe outra entidade com esse CPF/CNPJ.", "error")
            return render_template("entidades/form.html", entidade=entidade)

        entidade.tipo_entidade = tipo_entidade
        entidade.nome_razao_social = nome_razao_social
        entidade.nome_fantasia = nome_fantasia
        entidade.cpf_cnpj = cpf_cnpj
        entidade.inscricao_estadual = inscricao_estadual
        entidade.email = email
        entidade.telefone = telefone
        entidade.cep = cep
        entidade.logradouro = logradouro
        entidade.numero = numero
        entidade.bairro = bairro
        entidade.cidade = cidade
        entidade.uf = uf

        db.session.commit()

        flash("Entidade atualizada com sucesso.", "success")
        return redirect(url_for("entidades.listar"))

    return render_template("entidades/form.html", entidade=entidade)


@entidades_bp.route("/<int:id>/toggle", methods=["POST"])
@login_required
def toggle_ativo(id):
    entidade = Entidade.query.get_or_404(id)
    entidade.ativo = not entidade.ativo
    db.session.commit()

    if entidade.ativo:
        flash("Entidade ativada com sucesso.", "success")
    else:
        flash("Entidade desativada com sucesso.", "success")

    return redirect(url_for("entidades.listar"))
