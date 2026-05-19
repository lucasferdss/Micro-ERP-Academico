function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(2).replace(".", ",")}%`;
}

function linhaDre(conta, descricao, valor, destaque = false) {
  return `
    <tr>
      <td><strong>${conta}</strong></td>
      <td>${descricao}</td>
      <td><strong>${formatarMoeda(valor)}</strong></td>
    </tr>
  `;
}

async function carregarDRE() {
  const statusEl = document.getElementById("dre-status");
  const tbody = document.getElementById("dre-tbody");

  try {
    statusEl.textContent = "Carregando DRE...";

    const dre = await API.get("/api/dre");

    const receitaBruta = Number(dre.receita_bruta || 0);
    const impostos = Number(dre.deducoes_impostos || 0);
    const receitaLiquida = Number(dre.receita_liquida || 0);
    const cmv = Number(dre.cmv || 0);
    const lucroBruto = Number(dre.lucro_bruto || 0);
    const lucroLiquido = Number(dre.lucro_liquido || 0);

    document.getElementById("receita-bruta").textContent = formatarMoeda(receitaBruta);
    document.getElementById("impostos").textContent = formatarMoeda(impostos);
    document.getElementById("lucro-liquido").textContent = formatarMoeda(lucroLiquido);
    document.getElementById("resultado-final").textContent = formatarMoeda(lucroLiquido);

    const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    document.getElementById("margem-liquida").textContent = formatarPercentual(margem);

    const resultadoLabel = document.getElementById("resultado-label");
    const resultadoDescricao = document.getElementById("resultado-descricao");

    if (lucroLiquido >= 0) {
      resultadoLabel.textContent = "A empresa teve lucro";
      resultadoDescricao.textContent = "O resultado final ficou positivo após custos e impostos.";
    } else {
      resultadoLabel.textContent = "A empresa teve prejuízo";
      resultadoDescricao.textContent = "O resultado final ficou negativo após custos e impostos.";
    }

    tbody.innerHTML = [
      linhaDre("1", "Receita Bruta de Vendas", receitaBruta),
      linhaDre("2", "(-) Impostos sobre Vendas - Simples Nacional", -impostos),
      linhaDre("3", "Receita Líquida", receitaLiquida),
      linhaDre("4", "(-) Custo das Mercadorias Vendidas - CMV", -cmv),
      linhaDre("5", "Lucro Bruto", lucroBruto),
      linhaDre("6", "Lucro / Prejuízo Líquido", lucroLiquido, true)
    ].join("");

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar a DRE.";
    tbody.innerHTML = `
      <tr>
        <td colspan="3">Não foi possível carregar a DRE.</td>
      </tr>
    `;
  }
}

document.addEventListener("DOMContentLoaded", carregarDRE);