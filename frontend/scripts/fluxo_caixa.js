function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function criarBadgeStatus(status) {
  const statusNormalizado = String(status || "PENDENTE").toUpperCase();

  if (
    statusNormalizado === "PAGO" ||
    statusNormalizado === "PAGA" ||
    statusNormalizado === "RECEBIDO" ||
    statusNormalizado === "QUITADO" ||
    statusNormalizado === "QUITADA"
  ) {
    return `<span class="status-pill success">${statusNormalizado}</span>`;
  }

  if (statusNormalizado === "VENCIDO" || statusNormalizado === "ATRASADO") {
    return `<span class="status-pill danger">${statusNormalizado}</span>`;
  }

  return `<span class="status-pill warning">${statusNormalizado}</span>`;
}

function montarLinha(tipo, conta) {
  return `
    <tr>
      <td>${tipo}</td>
      <td>${conta.descricao || "-"}</td>
      <td>${formatarMoeda(conta.valor)}</td>
      <td>${criarBadgeStatus(conta.status)}</td>
    </tr>
  `;
}

function montarTabela(contasReceber, contasPagar, tbodyId) {
  const tbody = document.getElementById(tbodyId);

  const linhas = [
    ...(contasReceber || []).map((conta) => montarLinha("Receber", conta)),
    ...(contasPagar || []).map((conta) => montarLinha("Pagar", conta))
  ];

  if (linhas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Nenhum vencimento encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = linhas.join("");
}

async function carregarFluxoCaixa() {
  const statusEl = document.getElementById("fluxo-status");

  try {
    statusEl.textContent = "Carregando fluxo de caixa...";

    const fluxo = await API.get("/api/fluxo-caixa");

    document.getElementById("receber-mes").textContent = formatarMoeda(fluxo.receber_mes);
    document.getElementById("pagar-mes").textContent = formatarMoeda(fluxo.pagar_mes);
    document.getElementById("saldo-previsto").textContent = formatarMoeda(fluxo.saldo_previsto);

    document.getElementById("receber-hoje").textContent = formatarMoeda(fluxo.receber_hoje);
    document.getElementById("pagar-hoje").textContent = formatarMoeda(fluxo.pagar_hoje);
    document.getElementById("receber-amanha").textContent = formatarMoeda(fluxo.receber_amanha);
    document.getElementById("pagar-amanha").textContent = formatarMoeda(fluxo.pagar_amanha);

    montarTabela(
      fluxo.contas_receber_hoje,
      fluxo.contas_pagar_hoje,
      "vencimentos-hoje-tbody"
    );

    montarTabela(
      fluxo.contas_receber_amanha,
      fluxo.contas_pagar_amanha,
      "vencimentos-amanha-tbody"
    );

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar fluxo de caixa.";
  }
}

document.addEventListener("DOMContentLoaded", carregarFluxoCaixa);