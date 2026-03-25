from flask import Blueprint, jsonify, request
from flask_login import login_user, logout_user, login_required, current_user

from app.models.usuario import Usuario

auth_api_bp = Blueprint("auth_api", __name__)


def usuario_to_dict(usuario: Usuario) -> dict:
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil,
        "ativo": usuario.ativo,
    }


@auth_api_bp.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip()
    senha = data.get("password") or ""

    if not email:
        return jsonify({"error": "E-mail é obrigatório."}), 400

    if not senha:
        return jsonify({"error": "Senha é obrigatória."}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    if not usuario:
        return jsonify({"error": "Usuário não encontrado."}), 404

    if not usuario.ativo:
        return jsonify({"error": "Usuário inativo."}), 403

    if not usuario.check_password(senha):
        return jsonify({"error": "Senha inválida."}), 401

    login_user(usuario)
    return jsonify({
        "message": "Login realizado com sucesso.",
        "user": usuario_to_dict(usuario),
    })


@auth_api_bp.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    logout_user()
    return jsonify({"message": "Logout realizado com sucesso."})


@auth_api_bp.route("/api/me", methods=["GET"])
def api_me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False}), 401

    return jsonify({
        "authenticated": True,
        "user": usuario_to_dict(current_user),
    })