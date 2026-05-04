let produtosCache = [];
let fornecedoresCache = [];
let comprasCache = [];
let itemCounter = 0;

const moneyBR = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberBR = (value) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function nomeEntidade(entidade) {
  return entidade?.nome_razao_social || entidade?.nome_fantasia || `Entidade #${entidade?.id || "-"}`;
}

function isFornecedor(entidade) {
  const tipo = String(entidade?.tipo_entidade || "").toLowerCase();
  return tipo.includes("fornecedor") || tipo === "f";
}

function produtoOptions() {
  return produtosCache.map((produto) => `
    <option value="${produto.id}" data-custo="${produto.preco_custo || 0}">
      ${produto.nome || "Produto"} • Estoque: ${produto.estoque_atual ?? 0}
    </option>
  `).join("");
}

function atualizarSelectFornecedores() {
  const select = document.getElementById("fornecedor_id");
  fornecedoresCache = fornecedoresCache.filter(isFornecedor);

  if (!fornecedoresCache.length) {
    select.innerHTML = `<option value="">Nenhum fornecedor cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um fornecedor</option>` + fornecedoresCache.map((entidade) => `
    <option value="${entidade.id}">${nomeEntidade(entidade)}</option>
  `).join("");
}

function criarLinhaItem() {
  itemCounter += 1;
  const id = itemCounter;
  const tbody = document.getElementById("itens-compra-tbody");

  const tr = document.createElement("tr");
  tr.dataset.itemId = String(id);
  tr.innerHTML = `
    <td>
      <select class="form-input item-produto" required>
        <option value="">Selecione</option>
        ${produtoOptions()}
      </select>
    </td>
    <td><input class="form-input item-qtd" type="number" min="0.01" step="0.01" value="1" required /></td>
    <td><input class="form-input item-custo" type="number" min="0.01" step="0.01" value="0" required /></td>
    <td class="item-subtotal">R$ 0,00</td>
    <td><button type="button" class="btn-danger" onclick="removerLinhaItem(${id})">Remover</button></td>
  `;

  tbody.appendChild(tr);
  tr.querySelector(".item-produto").addEventListener("change", (event) => {
    const option = event.target.selectedOptions[0];
    tr.querySelector(".item-custo").value = option?.dataset?.custo || 0;
    recalcularTotais();
  });
  tr.querySelector(".item-qtd").addEventListener("input", recalcularTotais);
  tr.querySelector(".item-custo").addEventListener("input", recalcularTotais);
  recalcularTotais();
}

function removerLinhaItem(id) {
  const tr = document.querySelector(`tr[data-item-id="${id}"]`);
  if (tr) tr.remove();
  recalcularTotais();
}

function getItensFormulario() {
  return Array.from(document.querySelectorAll("#itens-compra-tbody tr")).map((tr) => ({
    produto_id: Number(tr.querySelector(".item-produto").value),
    quantidade: Number(tr.querySelector(".item-qtd").value || 0),
    custo_unitario: Number(tr.querySelector(".item-custo").value || 0),
  })).filter((item) => item.produto_id && item.quantidade > 0 && item.custo_unitario > 0);
}

function recalcularTotais() {
  let total = 0;
  document.querySelectorAll("#itens-compra-tbody tr").forEach((tr) => {
    const qtd = Number(tr.querySelector(".item-qtd")?.value || 0);
    const custo = Number(tr.querySelector(".item-custo")?.value || 0);
    const subtotal = qtd * custo;
    total += subtotal;
    tr.querySelector(".item-subtotal").textContent = moneyBR(subtotal);
  });

  const desconto = Number(document.getElementById("desconto")?.value || 0);
  document.getElementById("total-compra").textContent = moneyBR(Math.max(total - desconto, 0));
}

function limparFormulario() {
  document.getElementById("compra-form").reset();
  document.getElementById("itens-compra-tbody").innerHTML = "";
  document.getElementById("desconto").value = 0;
  criarLinhaItem();
  recalcularTotais();
}

async function carregarBase() {
  const [produtos, entidades] = await Promise.all([
    API.get("/api/produtos"),
    API.get("/api/entidades"),
  ]);

  produtosCache = Array.isArray(produtos) ? produtos.filter((p) => p.ativo !== false) : [];
  fornecedoresCache = Array.isArray(entidades) ? entidades.filter((e) => e.ativo !== false) : [];
  atualizarSelectFornecedores();
}

async function carregarCompras() {
  const tbody = document.getElementById("compras-tbody");
  const status = document.getElementById("compras-status");

  try {
    status.textContent = "Carregando compras...";
    const compras = await API.get("/api/compras");
    comprasCache = Array.isArray(compras) ? compras : [];

    if (!comprasCache.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma compra cadastrada.</td></tr>`;
      status.textContent = "";
      return;
    }

    tbody.innerHTML = comprasCache.map((compra) => {
      const itens = compra.itens_compra || [];
      const podeConfirmar = compra.status !== "confirmada";
      return `
        <tr>
          <td>#${compra.id}</td>
          <td>${nomeEntidade(compra.fornecedor)}</td>
          <td><span class="status-pill ${compra.status === "confirmada" ? "success" : "warning"}">${compra.status}</span></td>
          <td>${moneyBR(compra.total)}</td>
          <td>${itens.length}</td>
          <td>
            ${podeConfirmar ? `<button type="button" class="btn-primary small" onclick="confirmarCompra(${compra.id})">Confirmar</button>` : `<span class="muted">Estoque lançado</span>`}
          </td>
        </tr>
      `;
    }).join("");

    status.textContent = "";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar compras.</td></tr>`;
    status.textContent = error.message || "Erro ao carregar compras.";
  }
}

async function carregarMovimentacoes() {
  const tbody = document.getElementById("movimentacoes-tbody");
  try {
    const movs = await API.get("/api/movimentacoes-estoque");
    const lista = Array.isArray(movs) ? movs.slice(0, 12) : [];

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma movimentação registrada ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((mov) => `
      <tr>
        <td>${mov.produto?.nome || `Produto #${mov.produto_id}`}</td>
        <td><span class="status-pill ${mov.tipo === "ENTRADA" ? "success" : "danger"}">${mov.tipo}</span></td>
        <td>${mov.origem} #${mov.origem_id || "-"}</td>
        <td>${numberBR(mov.quantidade)}</td>
        <td>${numberBR(mov.saldo_anterior)}</td>
        <td>${numberBR(mov.saldo_novo)}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar movimentações.</td></tr>`;
  }
}

async function salvarCompra(event) {
  event.preventDefault();
  const status = document.getElementById("form-status");
  const itens = getItensFormulario();

  if (!itens.length) {
    status.textContent = "Adicione pelo menos um item válido na compra.";
    return;
  }

  const payload = {
    fornecedor_id: Number(document.getElementById("fornecedor_id").value),
    numero_pedido: document.getElementById("numero_pedido").value.trim(),
    nf_entrada: document.getElementById("nf_entrada").value.trim(),
    forma_pagamento: document.getElementById("forma_pagamento").value.trim(),
    desconto: Number(document.getElementById("desconto").value || 0),
    itens,
  };

  try {
    status.textContent = "Salvando compra...";
    await API.post("/api/compras", payload);
    status.textContent = "Compra cadastrada como pendente. Agora confirme para atualizar o estoque.";
    limparFormulario();
    await carregarCompras();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao salvar compra.";
  }
}

async function confirmarCompra(id) {
  const compra = comprasCache.find((item) => item.id === id);
  const nf = compra?.nf_entrada || prompt("Informe a NF de entrada (opcional):") || "";
  const forma = compra?.forma_pagamento || prompt("Informe a forma de pagamento (opcional):") || "";

  try {
    await API.post(`/api/compras/${id}/confirmar`, {
      nf_entrada: nf,
      forma_pagamento: forma,
    });
    await Promise.all([carregarCompras(), carregarBase(), carregarMovimentacoes()]);
    alert("Compra confirmada. Estoque atualizado automaticamente.");
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao confirmar compra.");
  }
}

async function iniciarTela() {
  try {
    await carregarBase();
    criarLinhaItem();
    await Promise.all([carregarCompras(), carregarMovimentacoes()]);
  } catch (error) {
    console.error(error);
    document.getElementById("form-status").textContent = error.message || "Erro ao iniciar tela.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("compra-form").addEventListener("submit", salvarCompra);
  document.getElementById("add-item-button").addEventListener("click", criarLinhaItem);
  document.getElementById("limpar-form-button").addEventListener("click", limparFormulario);
  document.getElementById("desconto").addEventListener("input", recalcularTotais);
  iniciarTela();
});

window.removerLinhaItem = removerLinhaItem;
window.confirmarCompra = confirmarCompra;
