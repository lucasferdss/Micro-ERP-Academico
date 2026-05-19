function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(2).replace(".", ",")}%`;
}

function linhaImposto(item, descricao, valor) {
  return `
    <tr>
      <td><strong>${item}</strong></td>
      <td>${descricao}</td>
      <td><strong>${valor}</strong></td>
    </tr>
  `;
}

async function carregarImpostos() {
  const statusEl = document.getElementById("impostos-status");
  const tbody = document.getElementById("impostos-tbody");

  try {
    statusEl.textContent = "Carregando impostos...";

    const dados = await API.get("/api/impostos");

    const regime = dados.regime || "Simples Nacional";
    const receita = Number(dados.receita_bruta || 0);
    const aliquotaPercentual = Number(dados.aliquota_percentual || 0);
    const imposto = Number(dados.imposto_estimado || 0);

    document.getElementById("regime-label").textContent = regime;
    document.getElementById("receita-bruta").textContent = formatarMoeda(receita);
    document.getElementById("aliquota").textContent = formatarPercentual(aliquotaPercentual);
    document.getElementById("aliquota-hero").textContent = formatarPercentual(aliquotaPercentual);
    document.getElementById("imposto-estimado").textContent = formatarMoeda(imposto);
    document.getElementById("imposto-final").textContent = formatarMoeda(imposto);
    document.getElementById("formula-imposto").textContent =
      `${formatarMoeda(receita)} × ${formatarPercentual(aliquotaPercentual)}`;

    tbody.innerHTML = [
      linhaImposto("1", "Regime tributário utilizado", regime),
      linhaImposto("2", "Receita bruta acumulada em vendas", formatarMoeda(receita)),
      linhaImposto("3", "Alíquota aplicada no Simples Nacional", formatarPercentual(aliquotaPercentual)),
      linhaImposto("4", "Imposto estimado a recolher", formatarMoeda(imposto))
    ].join("");

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar impostos.";
    tbody.innerHTML = `
      <tr>
        <td colspan="3">Não foi possível carregar o cálculo de impostos.</td>
      </tr>
    `;
  }
}

document.addEventListener("DOMContentLoaded", carregarImpostos);    