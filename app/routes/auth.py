from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.models.usuario import Usuario

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        senha = request.form.get("password", "")

        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario:
            flash("Usuário não encontrado.", "error")
            return render_template("auth/login.html")

        if not usuario.ativo:
            flash("Usuário inativo.", "error")
            return render_template("auth/login.html")

        if not usuario.check_password(senha):
            flash("Senha inválida.", "error")
            return render_template("auth/login.html")

        login_user(usuario)
        flash("Login realizado com sucesso.", "success")
        return redirect(url_for("dashboard"))

    return render_template("auth/login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Você saiu do sistema.", "success")
    return redirect(url_for("auth.login"))
