from pathlib import Path
from flask import Flask, redirect, send_from_directory, url_for
from flask_login import login_required
from .config import Config
from .extensions import db, migrate, login_manager


def create_app():
    base_dir = Path(__file__).resolve().parent.parent.parent
    styles_dir = base_dir / "frontend" / "styles"
    scripts_dir = base_dir / "frontend" / "scripts"
    pages_dir = base_dir / "frontend" / "pages"

    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "login_page"

    from .models import Usuario, Entidade, Produto, PlanoConta
    from .api.auth_api import auth_api_bp
    from .api.entidades_api import entidades_api_bp
    from .api.produtos_api import produtos_api_bp
    from .api.plano_contas_api import plano_contas_api_bp

    app.register_blueprint(auth_api_bp)
    app.register_blueprint(entidades_api_bp)
    app.register_blueprint(produtos_api_bp)
    app.register_blueprint(plano_contas_api_bp)

    @app.route("/")
    def home():
        return redirect(url_for("login_page"))

    @app.route("/login")
    def login_redirect():
        return redirect(url_for("login_page"))

    @app.route("/dashboard")
    @login_required
    def dashboard_redirect():
        return redirect(url_for("dashboard_page"))

    @app.route("/entidades")
    @login_required
    def entidades_redirect():
        return redirect(url_for("entidades_page"))

    @app.route("/produtos")
    @login_required
    def produtos_redirect():
        return redirect(url_for("produtos_page"))

    @app.route("/plano-contas")
    @login_required
    def plano_contas_redirect():
        return redirect(url_for("plano_contas_page"))

    @app.route("/styles/<path:filename>")
    def serve_styles(filename):
        return send_from_directory(str(styles_dir), filename)

    @app.route("/scripts/<path:filename>")
    def serve_scripts(filename):
        return send_from_directory(str(scripts_dir), filename)

    @app.route("/pages/login")
    def login_page():
        return send_from_directory(str(pages_dir), "login.html")

    @app.route("/pages/dashboard")
    @login_required
    def dashboard_page():
        return send_from_directory(str(pages_dir), "dashboard.html")

    @app.route("/pages/entidades")
    @login_required
    def entidades_page():
        return send_from_directory(str(pages_dir), "entidades.html")

    @app.route("/pages/produtos")
    @login_required
    def produtos_page():
        return send_from_directory(str(pages_dir), "produtos.html")

    @app.route("/pages/plano-contas")
    @login_required
    def plano_contas_page():
        return send_from_directory(str(pages_dir), "plano_contas.html")

    return app