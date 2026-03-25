# Micro-ERP Acadêmico

Sistema acadêmico de gestão integrada desenvolvido para a disciplina, com foco inicial na **Sprint 1: Alicerce (Cadastros e Segurança)**.

O projeto foi estruturado como um **ERP web monolítico**, com:

- **Backend em Python + Flask**
- **Frontend em HTML, CSS e JavaScript**
- **Banco de dados relacional com SQLAlchemy + Alembic**
- **Autenticação com Flask-Login**

Neste estágio atual, o sistema já possui os módulos base de:

- Login/autenticação
- Cadastro de Entidades
- Cadastro de Produtos
- Cadastro de Plano de Contas
- Dashboard inicial

---

## Objetivo do projeto

O Micro-ERP Acadêmico tem como objetivo simular um sistema de gestão integrada para pequenas empresas, permitindo a evolução por sprints até contemplar módulos como:

- Cadastros mestres
- Compras
- Estoque
- Vendas
- Financeiro
- Contabilidade

Atualmente, o projeto está focado na base pedida pela **Sprint 1**, que concentra a parte de **cadastros e segurança**.

---

## Tecnologias utilizadas

### Backend
- Python
- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-Login
- Alembic
- python-dotenv
- PostgreSQL

### Frontend
- HTML5
- CSS3
- JavaScript

---

## Estrutura do projeto

```bash
Micro-ERP Acadêmico/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth_api.py
│   │   │   ├── entidades_api.py
│   │   │   ├── produtos_api.py
│   │   │   └── plano_contas_api.py
│   │   ├── models/
│   │   │   ├── usuario.py
│   │   │   ├── entidade.py
│   │   │   ├── produto.py
│   │   │   └── plano_conta.py
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── extensions.py
│   ├── migrations/
│   ├── requirements.txt
│   ├── run.py
│   └── seed_admin.py
│
├── frontend/
│   ├── pages/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── entidades.html
│   │   ├── produtos.html
│   │   └── plano_contas.html
│   ├── scripts/
│   │   ├── api.js
│   │   ├── login.js
│   │   ├── dashboard_page.js
│   │   ├── entidades.js
│   │   ├── produtos.js
│   │   └── plano_contas.js
│   └── styles/
│       ├── global.css
│       ├── auth.css
│       ├── dashboard.css
│       ├── entidades.css
│       ├── produtos.css
│       └── plano_contas.css
│
└── README.md
