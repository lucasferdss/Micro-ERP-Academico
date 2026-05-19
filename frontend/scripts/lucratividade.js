function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(2).replace(".", ",")}%`;
}

function linhaLucratividade(item) {
  return `
    <tr>
      <td>${item.produto_nome || "-"}</td>
      <td>${Number(item.quantidade || 0)}</td>
      <td>${formatarMoeda(item.preco_unitario)}</td>
      <td>${formatarMoeda(item.custo_unitario)}</td>
      <td>${formatarMoeda(item.receita)}</td>
      <td>${formatarMoeda(item.custo_total)}</td>
      <td><strong>${formatarMoeda(item.lucro)}</strong></td>
      <td>${formatarPercentual(item.margem_percentual)}</td>
    </tr>
  `;
}

async function carregarLucratividade() {
  const statusEl = document.getElementById("lucratividade-status");
  const tbody = document.getElementById("lucratividade-tbody");

  try {
    statusEl.textContent = "Carregando relatório de lucratividade...";

    const dados = await API.get("/api/lucratividade");

    document.getElementById("receita-total").textContent = formatarMoeda(dados.receita_total);
    document.getElementById("custo-total").textContent = formatarMoeda(dados.custo_total);
    document.getElementById("lucro-total").textContent = formatarMoeda(dados.lucro_total);
    document.getElementById("margem-total").textContent = formatarPercentual(dados.margem_percentual);

    const itens = dados.itens || [];

    if (itens.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Nenhum item vendido encontrado.</td>
        </tr>
      `;
      statusEl.textContent = "";
      return;
    }

    tbody.innerHTML = itens.map(linhaLucratividade).join("");

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar lucratividade.";
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Não foi possível carregar o relatório.</td>
      </tr>
    `;
  }
}

document.addEventListener("DOMContentLoaded", carregarLucratividade);