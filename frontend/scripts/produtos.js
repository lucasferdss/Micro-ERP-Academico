let produtoEditandoId = null;
let produtosCache = [];

function moeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function numero(valor, casas = 2) {
  const n = Number(valor || 0);
  return n.toFixed(casas);
}

function getPayloadProduto() {
  return {
    sku: document.getElementById("sku").value.trim(),
    nome: document.getElementById("nome").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    unidade_medida: document.getElementById("unidade_medida").value.trim(),
    preco_custo: document.getElementById("preco_custo").value.trim(),
    custo_medio: document.getElementById("custo_medio")?.value.trim() || "0.00",
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
  document.getElementById("preco_custo").value = numero(produto.preco_custo, 2);

  const custoMedioEl = document.getElementById("custo_medio");
  if (custoMedioEl) {
    custoMedioEl.value = numero(produto.custo_medio ?? produto.preco_custo, 2);
  }

  document.getElementById("preco_venda").value = numero(produto.preco_venda, 2);
  document.getElementById("estoque_atual").value = numero(produto.estoque_atual, 3);
  document.getElementById("estoque_minimo").value = numero(produto.estoque_minimo, 3);
}

function resetarValoresPadrao() {
  const unidade = document.getElementById("unidade_medida");
  const precoCusto = document.getElementById("preco_custo");
  const custoMedio = document.getElementById("custo_medio");
  const precoVenda = document.getElementById("preco_venda");
  const estoqueAtual = document.getElementById("estoque_atual");
  const estoqueMinimo = document.getElementById("estoque_minimo");

  if (unidade) unidade.value = "UN";
  if (precoCusto) precoCusto.value = "0.00";
  if (custoMedio) custoMedio.value = "0.00";
  if (precoVenda) precoVenda.value = "0.00";
  if (estoqueAtual) estoqueAtual.value = "0.000";
  if (estoqueMinimo) estoqueMinimo.value = "0.000";
}

function limparFormulario() {
  const form = document.getElementById("produto-form");
  if (form) form.reset();

  resetarValoresPadrao();
  produtoEditandoId = null;

  const submitButton = document.getElementById("submit-button");
  const cancelEditButton = document.getElementById("cancel-edit-button");
  const formStatus = document.getElementById("form-status");
  const panel = document.getElementById("product-form-panel");

  if (submitButton) submitButton.textContent = "Salvar produto";
  if (cancelEditButton) cancelEditButton.style.display = "none";
  if (formStatus) formStatus.textContent = "";
  if (panel) panel.classList.add("hidden");
}

function openProductForm(isEdit = false) {
  const productFormPanel = document.getElementById("product-form-panel");
  const produtoForm = document.getElementById("produto-form");
  const submitButton = document.getElementById("submit-button");
  const formStatus = document.getElementById("form-status");

  if (!productFormPanel) return;

  productFormPanel.classList.remove("hidden");

  if (!isEdit && produtoForm) {
    produtoForm.reset();
    resetarValoresPadrao();
    produtoEditandoId = null;
  }

  if (submitButton && !isEdit) submitButton.textContent = "Salvar produto";
  if (formStatus && !isEdit) {
    formStatus.textContent = "Formulário pronto para um novo cadastro.";
  }

  const firstField = document.getElementById("sku");
  if (firstField) firstField.focus();
}

function closeProductForm() {
  limparFormulario();
}

function iniciarEdicaoProduto(id) {
  const produto = produtosCache.find((item) => Number(item.id) === Number(id));
  if (!produto) return;

  produtoEditandoId = id;
  openProductForm(true);
  preencherFormulario(produto);

  const submitButton = document.getElementById("submit-button");
  const cancelEditButton = document.getElementById("cancel-edit-button");
  const formStatus = document.getElementById("form-status");

  if (submitButton) submitButton.textContent = "Atualizar produto";
  if (cancelEditButton) cancelEditButton.style.display = "inline-block";
  if (formStatus) formStatus.textContent = `Editando produto #${id}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function alternarStatusProduto(id) {
  const status = document.getElementById("produtos-status");

  try {
    if (status) status.textContent = "Atualizando status...";
    await API.patch(`/api/produtos/${id}/toggle`);
    await carregarProdutos();
    if (status) status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    if (status) status.textContent = error.message || "Erro ao atualizar status.";
  }
}

function montarStatusEstoque(produto) {
  const atual = Number(produto.estoque_atual || 0);
  const minimo = Number(produto.estoque_minimo || 0);

  if (!produto.ativo) return `<span class="badge badge-muted">Inativo</span>`;
  if (atual <= 0) return `<span class="badge badge-danger">Sem estoque</span>`;
  if (atual <= minimo) return `<span class="badge badge-warning">Estoque baixo</span>`;
  return `<span class="badge badge-success">Ativo</span>`;
}

async function carregarProdutos() {
  const tbody = document.getElementById("produtos-tbody");
  const status = document.getElementById("produtos-status");

  try {
    if (status) status.textContent = "Carregando produtos...";

    const produtos = await API.get("/api/produtos");
    produtosCache = Array.isArray(produtos) ? produtos : [];

    if (produtosCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13">Nenhum produto cadastrado.</td></tr>`;
      if (status) status.textContent = "";
      return;
    }

    tbody.innerHTML = produtosCache.map((produto) => {
      const precoCusto = Number(produto.preco_custo || 0);
      const custoMedio = Number(produto.custo_medio ?? produto.preco_custo ?? 0);
      const precoVenda = Number(produto.preco_venda || 0);
      const margem = produto.margem_lucro ?? (
        precoCusto > 0 ? ((precoVenda - precoCusto) / precoCusto) * 100 : 0
      );

      return `
        <tr>
          <td>${produto.id}</td>
          <td>${produto.sku ?? "-"}</td>
          <td>${produto.nome ?? "-"}</td>
          <td>${produto.unidade_medida ?? "-"}</td>
          <td>${moeda(precoCusto)}</td>
          <td>${moeda(custoMedio)}</td>
          <td>${moeda(precoVenda)}</td>
          <td>${numero(margem, 2)}%</td>
          <td>${numero(produto.estoque_atual, 3)}</td>
          <td>${numero(produto.estoque_minimo, 3)}</td>
          <td>${montarStatusEstoque(produto)}</td>
          <td>
            <button
              type="button"
              class="btn-secondary"
              onclick="carregarMovimentosEstoque(${produto.id})"
            >
              Ver
            </button>
          </td>
          <td>
            <button
              type="button"
              class="btn-secondary"
              onclick="iniciarEdicaoProduto(${produto.id})"
            >
              Editar
            </button>

            <button
              type="button"
              class="btn-secondary"
              onclick="alternarStatusProduto(${produto.id})"
            >
              ${produto.ativo ? "Desativar" : "Ativar"}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (status) status.textContent = "";
  } catch (error) {
    console.error(error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="13">Erro ao carregar produtos.</td></tr>`;
    }
    if (status) status.textContent = "Falha ao buscar dados da API.";
  }
}

async function carregarMovimentosEstoque(produtoId = null) {
  const tbody = document.getElementById("movimentos-estoque-tbody");
  const status = document.getElementById("movimentos-status");

  if (!tbody) {
    alert("Tabela de movimentos não encontrada no HTML.");
    return;
  }

  try {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">Carregando movimentos...</td>
      </tr>
    `;

    if (status) {
      status.textContent = "Carregando movimentos de estoque...";
    }

    const url = produtoId
      ? `/api/movimentacoes-estoque?produto_id=${produtoId}`
      : "/api/movimentacoes-estoque";

    const movimentos = await API.get(url);
    const lista = Array.isArray(movimentos) ? movimentos : [];

    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">Nenhum movimento encontrado para este produto.</td>
        </tr>
      `;

      if (status) {
        status.textContent = produtoId
          ? `Nenhum movimento encontrado para o produto #${produtoId}.`
          : "Nenhum movimento de estoque encontrado.";
      }

      tbody.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    tbody.innerHTML = lista.map((mov) => {
      const produtoNome =
        mov.produto_nome ||
        mov.produto?.nome ||
        mov.produtos?.nome ||
        `Produto #${mov.produto_id}`;

      const data = mov.created_at || mov.data || mov.data_movimento || "";
      const dataFormatada = data ? new Date(data).toLocaleString("pt-BR") : "-";

      const custoUnitario =
        mov.custo_unitario ??
        mov.custo_novo ??
        mov.custo_anterior ??
        0;

      const custoMedio =
        mov.custo_medio ??
        mov.custo_novo ??
        mov.custo_anterior ??
        0;

      return `
        <tr>
          <td>${dataFormatada}</td>
          <td>${produtoNome}</td>
          <td>${mov.tipo || "-"}</td>
          <td>${numero(mov.quantidade, 3)}</td>
          <td>${moeda(custoUnitario)}</td>
          <td>${moeda(custoMedio)}</td>
          <td>${mov.origem || mov.motivo || "-"}</td>
        </tr>
      `;
    }).join("");

    if (status) {
      status.textContent = produtoId
        ? `Movimentos carregados do produto #${produtoId}.`
        : "Movimentos carregados.";
    }

    tbody.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error("Erro ao carregar movimentos:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="7">Erro ao carregar movimentos de estoque.</td>
      </tr>
    `;

    if (status) {
      status.textContent = error.message || "Erro ao buscar movimentações.";
    }

    alert("Erro ao carregar movimentos. Veja o terminal do backend ou o console do navegador.");
  }
}

async function salvarProduto(event) {
  event.preventDefault();

  const status = document.getElementById("form-status");
  const payload = getPayloadProduto();

  try {
    if (produtoEditandoId) {
      if (status) status.textContent = "Atualizando produto...";
      await API.put(`/api/produtos/${produtoEditandoId}`, payload);
      if (status) status.textContent = "Produto atualizado com sucesso.";
    } else {
      if (status) status.textContent = "Salvando produto...";
      await API.post("/api/produtos", payload);
      if (status) status.textContent = "Produto cadastrado com sucesso.";
    }

    limparFormulario();
    await carregarProdutos();
    await carregarMovimentosEstoque();
  } catch (error) {
    console.error(error);
    if (status) status.textContent = error.message || "Erro ao salvar produto.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("produto-form");
  const cancelBtn = document.getElementById("cancel-edit-button");
  const newProductButton = document.getElementById("new-product-button");

  if (form) form.addEventListener("submit", salvarProduto);

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeProductForm();
    });
  }

  if (newProductButton) {
    newProductButton.addEventListener("click", () => {
      openProductForm(false);
    });
  }

  carregarProdutos();
  carregarMovimentosEstoque();
});

window.iniciarEdicaoProduto = iniciarEdicaoProduto;
window.alternarStatusProduto = alternarStatusProduto;
window.carregarMovimentosEstoque = carregarMovimentosEstoque;
window.openProductForm = openProductForm;
window.closeProductForm = closeProductForm;