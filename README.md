# 🚀 Micro-ERP Acadêmico

<p align="center">
  <img src="https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Python-Puro-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/ERP-Gestão%20Integrada-orange?style=for-the-badge" />
</p>

<p align="center">
  <b>Sistema acadêmico de gestão empresarial integrada</b><br>
  desenvolvido para simular o funcionamento de um ERP real, abrangendo os módulos de
  <b>Compras, Estoque, Vendas, Financeiro e Contabilidade</b>.
</p>

---

## ✨ Sobre o Projeto

O **Micro-ERP Acadêmico** é um sistema de gestão integrada desenvolvido para as disciplinas de:

- 📚 Sistemas de Informação Gerencial
- 📚 Contabilidade Básica

O projeto foi construído para simular os principais processos de uma empresa comercial, permitindo o gerenciamento completo do ciclo operacional:

### 🔄 Fluxo Integrado

```text
Compra → Estoque → Venda → Financeiro → Contabilidade
```

A solução foi desenvolvida utilizando uma arquitetura moderna baseada em:

- 🐍 Python Puro
- 🗄️ PostgreSQL (Supabase)
- 🔐 Supabase Auth
- 🎨 HTML, CSS e JavaScript Vanilla

---

## 🎯 Objetivos do Projeto

- Centralizar informações empresariais
- Automatizar processos operacionais
- Controlar estoque e movimentações
- Gerenciar compras e vendas
- Integrar o financeiro à contabilidade
- Gerar relatórios gerenciais e contábeis
- Simular o funcionamento de um ERP corporativo

---

# 🏗️ Arquitetura do Sistema

```text
Frontend
│
├── HTML5
├── CSS3
└── JavaScript Vanilla
        │
        ▼
Backend
│
└── Python Puro
        │
        ▼
Banco de Dados
│
└── PostgreSQL (Supabase)
        │
        ▼
Autenticação
│
└── Supabase Auth
```

---

# 🔐 Módulo de Autenticação

### Recursos

- Login Seguro
- Controle de Sessão
- Proteção de Rotas
- Gerenciamento de Usuários
- Perfis de Acesso
- Controle de Permissões

---

# 👥 Módulo de Cadastros

## Clientes

- CPF/CNPJ
- Razão Social
- Nome Fantasia
- Endereço
- Telefone
- E-mail

## Fornecedores

- Cadastro completo
- Consulta
- Atualização
- Inativação

## Usuários

- Administração de usuários
- Controle de perfis
- Permissões de acesso

---

# 📦 Módulo de Produtos

### Funcionalidades

- SKU único
- Nome do produto
- Unidade de medida
- Preço de custo
- Preço de venda
- Margem de lucro
- Estoque atual
- Estoque mínimo

### Benefícios

- Controle completo de mercadorias
- Apoio à formação de preços
- Controle de reposição

---

# 🛒 Módulo de Compras

### Recursos

- Emissão de pedidos de compra
- Seleção de fornecedores
- Inclusão de múltiplos produtos
- Aplicação de descontos
- Recebimento de mercadorias
- Registro de Nota Fiscal
- Atualização automática de estoque
- Integração com contas a pagar

---

# 📦 Gestão de Estoque

### Funcionalidades

- Entrada de mercadorias
- Saída de mercadorias
- Controle de estoque mínimo
- Atualização automática de saldo
- Cálculo de custo médio
- Histórico de movimentações
- Log de alterações
- Auditoria operacional

---

# 💰 Módulo Comercial (Vendas)

### Recursos

- Pedido de venda
- Seleção de clientes
- Múltiplos itens por pedido
- Aplicação de descontos
- Reserva automática de estoque
- Baixa automática de saldo
- Controle de disponibilidade
- Emissão de comprovantes

### Regras de Negócio

- Não permite vendas sem estoque disponível
- Mantém histórico de preços praticados
- Preserva integridade das movimentações

---

# 💳 Módulo Financeiro

## Contas a Receber

- Geração automática após venda
- Controle de vencimentos
- Baixa de recebimentos
- Consulta de títulos em aberto

## Contas a Pagar

- Integração automática com compras
- Controle de obrigações
- Baixa de pagamentos
- Histórico financeiro

## Fluxo de Caixa

- Entradas
- Saídas
- Saldo disponível
- Consultas gerenciais

---

# 🧾 Módulo Contábil

O sistema integra automaticamente eventos operacionais aos registros contábeis.

### Recursos

- Plano de Contas Hierárquico
- Lançamentos Contábeis
- Controle Patrimonial
- Controle de Receitas
- Controle de Despesas
- Controle de Impostos

---

# 📊 Relatórios Gerenciais

## Operacionais

- Produtos em estoque
- Estoque mínimo
- Compras realizadas
- Vendas realizadas

## Financeiros

- Contas a pagar
- Contas a receber
- Fluxo de caixa
- Lucratividade

## Contábeis

- Plano de Contas
- Balanço Patrimonial
- Demonstração do Resultado do Exercício (DRE)

---

# 📈 Conceitos Aplicados

## Sistemas de Informação Gerencial

- Integração de Processos
- Centralização de Dados
- Apoio à Tomada de Decisão
- Segurança da Informação
- Governança de Dados

## Contabilidade Básica

- Plano de Contas
- Balanço Patrimonial
- DRE
- Lançamentos Contábeis
- Gestão Financeira
- Controle Patrimonial

---

# 🧠 Diferenciais do Projeto

- ✅ Arquitetura limpa e modular
- ✅ Banco PostgreSQL
- ✅ Autenticação segura
- ✅ ERP totalmente integrado
- ✅ Código organizado
- ✅ Fácil manutenção
- ✅ Aplicação prática de conceitos acadêmicos
- ✅ Estrutura semelhante a ERPs corporativos

---

# 🛠️ Tecnologias Utilizadas

## Backend

- 🐍 Python Puro
- 🌐 http.server

## Frontend

- 🌍 HTML5
- 🎨 CSS3
- ⚡ JavaScript Vanilla

## Banco de Dados

- 🐘 PostgreSQL
- 🗄️ Supabase

## Autenticação

- 🔐 Supabase Auth

## Dependências

```bash
supabase
python-dotenv
```

---

# 🚀 Como Rodar o Projeto

## 1. Criar Ambiente Virtual

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

---

## 2. Instalar Dependências

```bash
pip install -r requirements.txt
```

---

## 3. Configurar Variáveis de Ambiente

Criar um arquivo `.env` dentro da pasta `backend/`

```env
SUPABASE_URL=sua_url
SUPABASE_KEY=sua_key
```

---

## 4. Executar o Sistema

```bash
python run.py
```

Servidor:

```text
http://localhost:8080
```

---

# 📂 Estrutura do Projeto

```text
Micro-ERP-Academico/
│
├── backend/
│   ├── app/
│   │   ├── config.py
│   │   ├── server.py
│   │   └── services/
│   │
│   ├── requirements.txt
│   ├── run.py
│   └── .env
│
├── frontend/
│   ├── pages/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── entidades.html
│   │   ├── produtos.html
│   │   ├── compras.html
│   │   ├── vendas.html
│   │   ├── financeiro.html
│   │   └── contabilidade.html
│   │
│   ├── scripts/
│   │
│   └── styles/
│
├── docs/
│   ├── DER
│   ├── Wireframes
│   ├── Balanço Patrimonial
│   └── DRE
│
└── README.md
```

---

# ✅ Funcionalidades Entregues

| Sprint | Status |
|----------|----------|
| Sprint 1 — Cadastros e Segurança | ✅ |
| Sprint 2 — Compras e Estoque | ✅ |
| Sprint 3 — Vendas e Regras de Negócio | ✅ |
| Sprint 4 — Financeiro e Fluxo de Caixa | ✅ |
| Sprint 5 — Contabilidade, Balanço e DRE | ✅ |

---

# 👨‍💻 Equipe

Projeto desenvolvido para fins acadêmicos nas disciplinas:

- Sistemas de Informação Gerencial
- Contabilidade Básica

Universidade UNIUBE

---

# 📄 Licença

Projeto desenvolvido exclusivamente para fins educacionais e acadêmicos.

---

<p align="center">
  Desenvolvido com ❤️ para aplicação prática dos conceitos de Sistemas de Informação Gerencial e Contabilidade Básica.
</p>
