function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function linhaBalanco(grupo, conta, valor) {
  return `
    <tr>
      <td><strong>${grupo}</strong></td>
      <td>${conta}</td>
      <td><strong>${formatarMoeda(valor)}</strong></td>
    </tr>
  `;
}

async function carregarBalanco() {
  const statusEl = document.getElementById("balanco-status");

  try {
    statusEl.textContent = "Carregando balanço patrimonial...";

    const balanco = await API.get("/api/balanco");

    const ativo = Number(balanco.ativo || 0);
    const passivo = Number(balanco.passivo || 0);
    const patrimonio = Number(balanco.patrimonio_liquido || 0);
    const estoque = Number(balanco.estoque || 0);
    const contasReceber = Number(balanco.contas_receber || 0);
    const contasPagar = Number(balanco.contas_pagar || 0);
    const caixa = Number(balanco.caixa_estimado || 0);

    document.getElementById("ativo-total").textContent = formatarMoeda(ativo);
    document.getElementById("passivo-total").textContent = formatarMoeda(passivo);
    document.getElementById("pl-total").textContent = formatarMoeda(patrimonio);

    document.getElementById("ativo-tbody").innerHTML = [
      linhaBalanco("Ativo Circulante", "Caixa estimado", caixa),
      linhaBalanco("Ativo Circulante", "Contas a Receber", contasReceber),
      linhaBalanco("Ativo Circulante", "Estoque", estoque),
      linhaBalanco("Total", "Total do Ativo", ativo)
    ].join("");

    document.getElementById("passivo-tbody").innerHTML = [
      linhaBalanco("Passivo Circulante", "Contas a Pagar", contasPagar),
      linhaBalanco("Total", "Total do Passivo", passivo),
      linhaBalanco("Patrimônio Líquido", "Resultado acumulado", patrimonio),
      linhaBalanco("Total", "Passivo + Patrimônio Líquido", passivo + patrimonio)
    ].join("");

    const diferenca = ativo - (passivo + patrimonio);

    document.getElementById("diferenca-balanco").textContent = formatarMoeda(diferenca);
    document.getElementById("equacao-final").textContent =
      `${formatarMoeda(ativo)} = ${formatarMoeda(passivo + patrimonio)}`;

    if (Math.abs(diferenca) < 0.01) {
      document.getElementById("equacao-label").textContent = "Balanço conferido";
      document.getElementById("equacao-descricao").textContent =
        "A equação patrimonial está equilibrada.";
    } else {
      document.getElementById("equacao-label").textContent = "Balanço com diferença";
      document.getElementById("equacao-descricao").textContent =
        "Existe diferença entre Ativo e Passivo + Patrimônio Líquido.";
    }

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar o balanço patrimonial.";
  }
}

document.addEventListener("DOMContentLoaded", carregarBalanco);