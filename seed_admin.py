from app import create_app
from app.extensions import db
from app.models.usuario import Usuario

app = create_app()

with app.app_context():
    email_admin = "admin@erp.com"

    usuario_existente = Usuario.query.filter_by(email=email_admin).first()

    if usuario_existente:
        print("Usuário admin já existe.")
    else:
        admin = Usuario(
            nome="Administrador",
            email=email_admin,
            perfil="ADMIN",
            ativo=True,
        )
        admin.set_password("123456")

        db.session.add(admin)
        db.session.commit()

        print("Usuário admin criado com sucesso.")
        print("Email: admin@erp.com")
        print("Senha: 123456")
        