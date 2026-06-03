# 🚀 Micro-ERP Acadêmico

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-1f6feb?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Python-Puro-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Backend%20as%20a%20Service-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-Vanilla%20HTML%20%7C%20CSS%20%7C%20JS-orange?style=for-the-badge" />
</p>

<p align="center">
  <b>Sistema acadêmico de gestão integrada</b><br>
  desenvolvido para proporcionar uma base <b>ágil, moderna, organizada e escalável</b>,
  com foco em <b>Cadastros, Organização e Segurança</b>.
</p>

---

## ✨ Sobre o Projeto

O **Micro-ERP Acadêmico** é um sistema de gestão integrado criado com objetivo educacional, simulando a estrutura inicial de um ERP real para pequenas empresas comerciais.

Nesta versão mais recente, o projeto evoluiu para uma arquitetura **Serverless / BaaS (Backend as a Service) 100% nativa**, eliminando frameworks pesados e adotando uma abordagem mais enxuta com:

- 🐍 **Python Puro**
- 🗄️ **Supabase (PostgreSQL + Auth)**
- 🎨 **Frontend em HTML, CSS e JavaScript Vanilla**
- 🔐 **Autenticação segura com Supabase Auth**

O foco principal desta etapa do sistema está em construir um **alicerce sólido**, cobrindo autenticação, cadastros mestres, navegação interna e organização contábil básica.

---

## 🎯 Funcionalidades Principais

### 🔐 Autenticação Segura
- Login integrado ao **Supabase Auth**
- Controle de sessão via cookies
- Proteção de rotas privadas
- Redirecionamento automático para a tela de login em acessos não autorizados

### 📊 Dashboard Interativo
- Painel inicial com mensagem de boas-vindas
- Exibição do perfil do usuário logado
- Navegação rápida entre os módulos principais do sistema

### 👥 Gestão de Entidades
Cadastro completo de **Clientes e Fornecedores**, com suporte para:
- CPF/CNPJ
- Inscrição Estadual
- Razão Social / Nome Fantasia
- Endereço completo
- Informações de contato

### 📦 Controle de Produtos
Gerenciamento completo do catálogo de produtos com:
- SKU
- Nome do produto
- Unidade de medida
- Preço de custo
- Preço de venda
- Estoque atual
- Estoque mínimo

### 🧾 Plano de Contas
Estruturação contábil básica com suporte para:
- Tipo da conta
- Natureza contábil
- Conta pai
- Hierarquia de contas dentro do balanço

---

## 🧠 Diferenciais do Projeto

- ✅ Arquitetura simples e didática
- ✅ Fácil de entender e apresentar academicamente
- ✅ Separação clara entre backend e frontend
- ✅ Uso mínimo de dependências externas
- ✅ Código mais limpo, leve e focado em aprendizado real

---

## 🛠️ Tecnologias Utilizadas

### Backend
- 🐍 **Python Puro**
- 🌐 `http.server` nativo do Python

### Frontend
- 🌍 **HTML5**
- 🎨 **CSS3**
- ⚡ **JavaScript Vanilla**

### Banco de Dados e Autenticação
- 🗄️ **Supabase**
- 🔑 **Supabase Auth**
- 🐘 **PostgreSQL**

### Dependências Python
- `supabase`
- `python-dotenv`

---

##  Como Rodar o Projeto pela Primeira Vez

### Passo a Passo

1. **Criação do Ambiente Virtual**
   Crie um ambiente isolado para não sujar seu Python global:
   ```bash
   python -m venv venv
   ```
   
   E então, ative o ambiente virtual:
   * **Windows:** `python -m venv venv`
   * **Mac/Linux:** `source venv/bin/activate`

2. **Instalação das Dependências**
   Com o `venv` ativado, instale os únicos dois pacotes exigidos:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Configuração das Variáveis de Ambiente (.env)**
   Dentro da pasta `backend/`, crie um arquivo com o nome exato `.env`. Adicione as chaves que você encontra no painel do seu Supabase em *Settings > API*:

4. **Iniciando o ERP**
   Estando com o seu ambiente virtual ativado na pasta `backend/`, digite:
   ```bash
   python run.py
   ```
   O console deve mostrar: `Servidor rodando! Acesse: http://localhost:8080`.
   Nesse instante, seu navegador será aberto automaticamente direto na tela de Login! Basta entrar com o admin@erp.com e com a senha 123456! 

---

## 📂 Estrutura Limpa do Projeto

```text
Micro-ERP-Acad-mico/
├── backend/
│   ├── app/
│   │   ├── config.py       # Inicialização do banco do Supabase via Env Variables
│   │   └── server.py       # Roteador Nativo HTTP, Segurança de Rotas e Regras de API (CRUD)
│   ├── requirements.txt    # (supabase, python-dotenv)
│   ├── run.py              # Classe main para levantar o server na porta 8080
│   └── .env                # Credenciais de conexão (Não commitáveis)
│
├── frontend/
│   ├── pages/              # Apenas arquivos estruturais em HTML5
│   │   ├── dashboard.html, login.html, entidades.html, produtos.html, plano_contas.html
│   ├── scripts/            # Apenas Lógica de Interface e Consumo de API em Vanilla JS
│   │   ├── api.js, dashboard_page.js, login.js...
│   └── styles/             # Apenas Design e Identidade Visual em CSS3 Puro
│       ├── global.css, auth.css, dashboard.css...
│
└── README.md
```
