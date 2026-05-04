let produtosCache = [];
let clientesCache = [];
let vendasCache = [];
let itemCounter = 0;

const moneyBR = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberBR = (value) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function nomeEntidade(entidade) {
  return entidade?.nome_razao_social || entidade?.nome_fantasia || `Entidade #${entidade?.id || "-"}`;
}

function isCliente(entidade) {
  const tipo = String(entidade?.tipo_entidade || "").toLowerCase();
  return tipo.includes("cliente") || tipo === "c";
}

function produtoOptions() {
  return produtosCache.map((produto) => `
    <option value="${produto.id}" data-preco="${produto.preco_venda || 0}" data-estoque="${produto.estoque_atual || 0}">
      ${produto.nome || "Produto"} • Estoque: ${produto.estoque_atual ?? 0}
    </option>
  `).join("");
}

function atualizarSelectClientes() {
  const select = document.getElementById("cliente_id");
  clientesCache = clientesCache.filter(isCliente);

  if (!clientesCache.length) {
    select.innerHTML = `<option value="">Nenhum cliente cadastrado</option>`;
    return;
  }

  select.innerHTML = `<option value="">Selecione um cliente</option>` + clientesCache.map((entidade) => `
    <option value="${entidade.id}">${nomeEntidade(entidade)}</option>
  `).join("");
}

function criarLinhaItem() {
  itemCounter += 1;
  const id = itemCounter;
  const tbody = document.getElementById("itens-venda-tbody");

  const tr = document.createElement("tr");
  tr.dataset.itemId = String(id);
  tr.innerHTML = `
    <td>
      <select class="form-input item-produto" required>
        <option value="">Selecione</option>
        ${produtoOptions()}
      </select>
    </td>
    <td class="item-estoque">0</td>
    <td><input class="form-input item-qtd" type="number" min="0.01" step="0.01" value="1" required /></td>
    <td><input class="form-input item-preco" type="number" min="0.01" step="0.01" value="0" required /></td>
    <td class="item-subtotal">R$ 0,00</td>
    <td><button type="button" class="btn-danger" onclick="removerLinhaItem(${id})">Remover</button></td>
  `;

  tbody.appendChild(tr);
  tr.querySelector(".item-produto").addEventListener("change", (event) => {
    const option = event.target.selectedOptions[0];
    tr.querySelector(".item-preco").value = option?.dataset?.preco || 0;
    tr.querySelector(".item-estoque").textContent = option?.dataset?.estoque || 0;
    recalcularTotais();
  });
  tr.querySelector(".item-qtd").addEventListener("input", recalcularTotais);
  tr.querySelector(".item-preco").addEventListener("input", recalcularTotais);
  recalcularTotais();
}

function removerLinhaItem(id) {
  const tr = document.querySelector(`tr[data-item-id="${id}"]`);
  if (tr) tr.remove();
  recalcularTotais();
}

function getItensFormulario() {
  return Array.from(document.querySelectorAll("#itens-venda-tbody tr")).map((tr) => ({
    produto_id: Number(tr.querySelector(".item-produto").value),
    quantidade: Number(tr.querySelector(".item-qtd").value || 0),
    preco_unitario: Number(tr.querySelector(".item-preco").value || 0),
  })).filter((item) => item.produto_id && item.quantidade > 0 && item.preco_unitario > 0);
}

function recalcularTotais() {
  let total = 0;
  document.querySelectorAll("#itens-venda-tbody tr").forEach((tr) => {
    const qtd = Number(tr.querySelector(".item-qtd")?.value || 0);
    const preco = Number(tr.querySelector(".item-preco")?.value || 0);
    const subtotal = qtd * preco;
    total += subtotal;
    tr.querySelector(".item-subtotal").textContent = moneyBR(subtotal);
  });

  const desconto = Number(document.getElementById("desconto")?.value || 0);
  document.getElementById("total-venda").textContent = moneyBR(Math.max(total - desconto, 0));
}

function limparFormulario() {
  document.getElementById("venda-form").reset();
  document.getElementById("itens-venda-tbody").innerHTML = "";
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
  clientesCache = Array.isArray(entidades) ? entidades.filter((e) => e.ativo !== false) : [];
  atualizarSelectClientes();
}

async function carregarVendas() {
  const tbody = document.getElementById("vendas-tbody");
  const status = document.getElementById("vendas-status");

  try {
    status.textContent = "Carregando vendas...";
    const vendas = await API.get("/api/vendas");
    vendasCache = Array.isArray(vendas) ? vendas : [];

    if (!vendasCache.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma venda realizada.</td></tr>`;
      status.textContent = "";
      return;
    }

    tbody.innerHTML = vendasCache.map((venda) => `
      <tr>
        <td>#${venda.id}</td>
        <td>${nomeEntidade(venda.cliente)}</td>
        <td><span class="status-pill success">${venda.status}</span></td>
        <td>${moneyBR(venda.total)}</td>
        <td>${moneyBR(venda.imposto)}</td>
        <td><button type="button" class="btn-secondary small" onclick="abrirComprovante(${venda.id})">Comprovante</button></td>
      </tr>
    `).join("");

    status.textContent = "";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar vendas.</td></tr>`;
    status.textContent = error.message || "Erro ao carregar vendas.";
  }
}

async function salvarVenda(event) {
  event.preventDefault();
  const status = document.getElementById("form-status");
  const itens = getItensFormulario();

  if (!itens.length) {
    status.textContent = "Adicione pelo menos um item válido na venda.";
    return;
  }

  const payload = {
    cliente_id: Number(document.getElementById("cliente_id").value),
    numero_pedido: document.getElementById("numero_pedido").value.trim(),
    desconto: Number(document.getElementById("desconto").value || 0),
    itens,
  };

  try {
    status.textContent = "Finalizando venda...";
    const response = await API.post("/api/vendas", payload);
    status.textContent = "Venda finalizada. Estoque baixado automaticamente.";
    limparFormulario();
    await Promise.all([carregarBase(), carregarVendas()]);
    if (response?.venda?.id) abrirComprovante(response.venda.id);
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao finalizar venda.";
  }
}

async function abrirComprovante(id) {
  try {
    const data = await API.get(`/api/vendas/${id}/comprovante`);
    const venda = data.venda;
    const itens = data.itens || [];
    const panel = document.getElementById("comprovante-panel");
    const content = document.getElementById("comprovante-content");

    content.innerHTML = `
      <div class="receipt-top">
        <div>
          <h3>Venda #${venda.id}</h3>
          <p>Cliente: <strong>${nomeEntidade(venda.cliente)}</strong></p>
          <p>Status: <strong>${venda.status}</strong></p>
        </div>
        <div class="receipt-total">
          <span>Total</span>
          <strong>${moneyBR(venda.total)}</strong>
          <small>Imposto simples: ${moneyBR(venda.imposto)}</small>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Preço unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map((item) => `
              <tr>
                <td>${item.produto?.nome || `Produto #${item.produto_id}`}</td>
                <td>${numberBR(item.quantidade)}</td>
                <td>${moneyBR(item.preco_unitario)}</td>
                <td>${moneyBR(item.subtotal)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao abrir comprovante.");
  }
}

async function iniciarTela() {
  try {
    await carregarBase();
    criarLinhaItem();
    await carregarVendas();
  } catch (error) {
    console.error(error);
    document.getElementById("form-status").textContent = error.message || "Erro ao iniciar tela.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("venda-form").addEventListener("submit", salvarVenda);
  document.getElementById("add-item-button").addEventListener("click", criarLinhaItem);
  document.getElementById("limpar-form-button").addEventListener("click", limparFormulario);
  document.getElementById("desconto").addEventListener("input", recalcularTotais);
  iniciarTela();
});

window.removerLinhaItem = removerLinhaItem;
window.abrirComprovante = abrirComprovante;
