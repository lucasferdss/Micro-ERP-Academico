let produtoEditandoId = null;
let produtosCache = [];

function getPayloadProduto() {
  return {
    sku: document.getElementById("sku").value.trim(),
    nome: document.getElementById("nome").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade_medida: document.getElementById("unidade_medida").value.trim(),
    preco_custo: document.getElementById("preco_custo").value.trim(),
    preco_venda: document.getElementById("preco_venda").value.trim(),
    estoque_atual: document.getElementById("estoque_atual").value.trim(),
    estoque_minimo: document.getElementById("estoque_minimo").value.trim()
  };
}

function preencherFormulario(produto) {
  document.getElementById("sku").value = produto.sku || "";
  document.getElementById("nome").value = produto.nome || "";
  document.getElementById("descricao").value = produto.descricao || "";
  document.getElementById("unidade_medida").value = produto.unidade_medida || "UN";
  document.getElementById("preco_custo").value = produto.preco_custo ?? "0.00";
  document.getElementById("preco_venda").value = produto.preco_venda ?? "0.00";
  document.getElementById("estoque_atual").value = produto.estoque_atual ?? "0.000";
  document.getElementById("estoque_minimo").value = produto.estoque_minimo ?? "0.000";
}

function limparFormulario() {
  document.getElementById("produto-form").reset();
  document.getElementById("unidade_medida").value = "UN";
  document.getElementById("preco_custo").value = "0.00";
  document.getElementById("preco_venda").value = "0.00";
  document.getElementById("estoque_atual").value = "0.000";
  document.getElementById("estoque_minimo").value = "0.000";
  produtoEditandoId = null;
  document.getElementById("submit-button").textContent = "Salvar";
  document.getElementById("cancel-edit-button").style.display = "none";
}

function iniciarEdicaoProduto(id) {
  const produto = produtosCache.find((item) => item.id === id);
  if (!produto) return;

  produtoEditandoId = id;
  preencherFormulario(produto);
  document.getElementById("submit-button").textContent = "Atualizar";
  document.getElementById("cancel-edit-button").style.display = "inline-block";
  document.getElementById("form-status").textContent = `Editando produto #${id}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function alternarStatusProduto(id) {
  const status = document.getElementById("produtos-status");

  try {
    status.textContent = "Atualizando status...";
    await API.patch(`/api/produtos/${id}/toggle`);
    await carregarProdutos();
    status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao atualizar status.";
  }
}

async function carregarProdutos() {
  const tbody = document.getElementById("produtos-tbody");
  const status = document.getElementById("produtos-status");

  try {
    status.textContent = "Carregando produtos...";

    const produtos = await API.get("/api/produtos");
    produtosCache = Array.isArray(produtos) ? produtos : [];

    if (produtosCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">Nenhum produto cadastrado.</td>
        </tr>
      `;
      status.textContent = "";
      return;
    }

    tbody.innerHTML = produtosCache.map((produto) => `
      <tr>
        <td>${produto.id}</td>
        <td>${produto.sku ?? "-"}</td>
        <td>${produto.nome ?? "-"}</td>
        <td>${produto.unidade_medida ?? "-"}</td>
        <td>R$ ${(produto.preco_custo ?? 0).toFixed(2)}</td>
        <td>R$ ${(produto.preco_venda ?? 0).toFixed(2)}</td>
        <td>${(produto.margem_lucro ?? 0).toFixed(2)}%</td>
        <td>${produto.estoque_atual ?? 0}</td>
        <td>${produto.estoque_minimo ?? 0}</td>
        <td>${produto.ativo ? "Ativo" : "Inativo"}</td>
        <td>
          <button type="button" class="btn-secondary" onclick="iniciarEdicaoProduto(${produto.id})">Editar</button>
          <button type="button" class="btn-secondary" onclick="alternarStatusProduto(${produto.id})">
            ${produto.ativo ? "Desativar" : "Ativar"}
          </button>
        </td>
      </tr>
    `).join("");

    status.textContent = "";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="11">Erro ao carregar produtos.</td>
      </tr>
    `;
    status.textContent = "Falha ao buscar dados da API.";
  }
}

async function salvarProduto(event) {
  event.preventDefault();

  const status = document.getElementById("form-status");
  const payload = getPayloadProduto();

  try {
    if (produtoEditandoId) {
      status.textContent = "Atualizando produto...";
      await API.put(`/api/produtos/${produtoEditandoId}`, payload);
      status.textContent = "Produto atualizado com sucesso.";
    } else {
      status.textContent = "Salvando produto...";
      await API.post("/api/produtos", payload);
      status.textContent = "Produto cadastrado com sucesso.";
    }

    limparFormulario();
    await carregarProdutos();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao salvar produto.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("produto-form");
  const cancelBtn = document.getElementById("cancel-edit-button");

  if (form) {
    form.addEventListener("submit", salvarProduto);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", limparFormulario);
  }

  carregarProdutos();
});

window.iniciarEdicaoProduto = iniciarEdicaoProduto;
window.alternarStatusProduto = alternarStatusProduto;