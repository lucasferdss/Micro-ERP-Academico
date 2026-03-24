from flask import Flask, render_template
from flask_login import login_required
from .config import Config
from .extensions import db, migrate, login_manager


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    from .models import Usuario, Entidade, Produto, PlanoConta
    from .routes.auth import auth_bp
    from .routes.entidades import entidades_bp
    from .routes.produtos import produtos_bp
    from .routes.plano_contas import plano_contas_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(entidades_bp, url_prefix="/entidades")
    app.register_blueprint(produtos_bp, url_prefix="/produtos")
    app.register_blueprint(plano_contas_bp, url_prefix="/plano-contas")

    @app.route("/")
    def home():
        return "Projeto ERP em Flask rodando com sucesso."

    @app.route("/dashboard")
    @login_required
    def dashboard():
        return render_template("dashboard.html")

    return app