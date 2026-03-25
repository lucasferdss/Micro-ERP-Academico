# Micro-ERP Acadêmico

Sistema acadêmico de gestão integrada desenvolvido para proporcionar uma fundação ágil, moderna e escalável, focado em **Cadastros, Organização e Segurança**.

Nesta versão mais recente, o sistema evoluiu para uma **arquitetura Serverless/BaaS (Backend as a Service) 100% nativa**, eliminando frameworks pesados e adotando **Python Puro** acoplado ao poderoso **Supabase (PostgreSQL + Auth)**.

---

##  Funcionalidades Principais

Este Micro-ERP já conta com uma estrutura robusta dividida nos seguintes módulos:

- ** Autenticação Segura:** Autenticação gerenciada diretamente pelo Supabase Auth. O servidor Python gerencia o acesso via cookies e protege as rotas privadas ("Dashboard, Produtos, Contas, Entidades"), redirecionando tentativas não autorizadas para a tela de Login elegante.
- ** Dashboard Interativo:** Painel de boas-vindas com visualização rápida do perfil do usuário logado e navegação simplificada para os atalhos vitais do ERP.
- ** Gestão de Entidades:** Cadastro completo de **Clientes e Fornecedores**. Permite incluir CPF/CNPJ, Inscrição Estadual, Razão Social, endereços detalhados e contatos.
- ** Controle de Produtos:** Catálogo estruturado de produtos. Gerencie **SKU**, Nome, Unidade de Medida, Preços (Custo e Venda) com cálculo de inserção, bem como controle rigoroso de **Estoque Atual e Estoque Mínimo**.
- ** Plano de Contas:** Gestão da hierarquia contábil da sua empresa. Permite cadastrar contas com seus tipos (Ativo, Passivo, PL, Receita, Despesa), Natureza (Devedora/Credora) e definir qual é a "Conta Pai" dentro do escopo do balanço.

---

## 🛠 Tecnologias Utilizadas

Para garantir a **maior pureza, legibilidade e performance possível**, todo o código foi refatorado eliminando dependências engessadas (como ORMs complexos e renderizadores de tela):

*   **Backend (API & Routes):** Python Puro (`http.server` nativo no Python). 
*   **Frontend (Views & Logic):** Vanilla HTML5, CSS3 Moderno (Variáveis globais, CSS puro isolado por tela) e Vanilla JavaScript modular. Nenhuma biblioteca ou framework SPA é necessário.
*   **Banco de Dados & Autenticação:** Supabase (PostgreSQL) com integração via client oficial do Supabase.
*   **Dependências Python:** Estritamente limitadas ao necessário: `supabase` e `python-dotenv`.

---

##  Como Rodar o Projeto pela Primeira Vez

### Passo a Passo

1. **Criação do Ambiente Virtual**
   Crie um ambiente isolado para não sujar seu Python global:
   ```bash
   python -m venv venv
   ```
   
   E então, ative o ambiente virtual:
   * **Windows:** `venv\Scripts\activate`
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
