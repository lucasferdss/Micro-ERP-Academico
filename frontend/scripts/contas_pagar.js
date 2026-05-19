function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarData(data) {
  if (!data) return "-";

  const partes = String(data).split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterNomeFornecedor(conta) {
  const fornecedor = conta.fornecedor || {};

  return (
    fornecedor.nome_razao_social ||
    fornecedor.nome_fantasia ||
    fornecedor.email ||
    "-"
  );
}

function criarBadgeStatus(status) {
  const statusNormalizado = String(status || "PENDENTE").toUpperCase();

  if (
    statusNormalizado === "PAGO" ||
    statusNormalizado === "PAGA" ||
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

async function carregarContasPagar() {
  const tbody = document.getElementById("contas-pagar-tbody");
  const statusEl = document.getElementById("contas-status");

  const totalPagarEl = document.getElementById("total-pagar");
  const totalPagoEl = document.getElementById("total-pago");
  const totalPendenteEl = document.getElementById("total-pendente");

  try {
    statusEl.textContent = "Carregando contas a pagar...";

    const contas = await API.get("/api/contas-pagar");

    if (!Array.isArray(contas) || contas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">Nenhuma conta a pagar encontrada.</td>
        </tr>
      `;

      totalPagarEl.textContent = formatarMoeda(0);
      totalPagoEl.textContent = formatarMoeda(0);
      totalPendenteEl.textContent = formatarMoeda(0);
      statusEl.textContent = "";
      return;
    }

    let totalPagar = 0;
    let totalPago = 0;
    let totalPendente = 0;

    tbody.innerHTML = contas.map((conta) => {
      const valor = Number(conta.valor || 0);
      const status = String(conta.status || "PENDENTE").toUpperCase();

      totalPagar += valor;

      if (
        status === "PAGO" ||
        status === "PAGA" ||
        status === "QUITADO" ||
        status === "QUITADA"
      ) {
        totalPago += valor;
      } else {
        totalPendente += valor;
      }

      return `
        <tr>
          <td>${conta.id}</td>
          <td>#${conta.compra_id || "-"}</td>
          <td>${obterNomeFornecedor(conta)}</td>
          <td>${conta.descricao || "-"}</td>
          <td>${formatarMoeda(valor)}</td>
          <td>${formatarData(conta.data_vencimento)}</td>
          <td>${criarBadgeStatus(status)}</td>
        </tr>
      `;
    }).join("");

    totalPagarEl.textContent = formatarMoeda(totalPagar);
    totalPagoEl.textContent = formatarMoeda(totalPago);
    totalPendenteEl.textContent = formatarMoeda(totalPendente);

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar contas a pagar.";
  }
}

document.addEventListener("DOMContentLoaded", carregarContasPagar);