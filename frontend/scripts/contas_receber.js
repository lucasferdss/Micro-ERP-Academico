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

function obterNomeCliente(conta) {
  const cliente = conta.cliente || {};
  return (
    cliente.nome_razao_social ||
    cliente.nome_fantasia ||
    cliente.email ||
    "-"
  );
}

function criarBadgeStatus(status) {
  const statusNormalizado = String(status || "PENDENTE").toUpperCase();

  if (statusNormalizado === "PAGO" || statusNormalizado === "RECEBIDO") {
    return `<span class="status-pill success">${statusNormalizado}</span>`;
  }

  if (statusNormalizado === "VENCIDO") {
    return `<span class="status-pill danger">${statusNormalizado}</span>`;
  }

  return `<span class="status-pill warning">${statusNormalizado}</span>`;
}

async function carregarContasReceber() {
  const tbody = document.getElementById("contas-receber-tbody");
  const statusEl = document.getElementById("contas-status");

  const totalReceberEl = document.getElementById("total-receber");
  const totalPagoEl = document.getElementById("total-pago");
  const totalPendenteEl = document.getElementById("total-pendente");

  try {
    statusEl.textContent = "Carregando contas a receber...";

    const contas = await API.get("/api/contas-receber");

    if (!Array.isArray(contas) || contas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">Nenhuma conta a receber encontrada.</td>
        </tr>
      `;

      statusEl.textContent = "";
      return;
    }

    let totalReceber = 0;
    let totalPago = 0;
    let totalPendente = 0;

    tbody.innerHTML = contas.map((conta) => {
      const valor = Number(conta.valor || 0);
      const status = String(conta.status || "PENDENTE").toUpperCase();

      totalReceber += valor;

      if (status === "PAGO" || status === "RECEBIDO") {
        totalPago += valor;
      } else {
        totalPendente += valor;
      }

      return `
        <tr>
          <td>${conta.id}</td>
          <td>#${conta.venda_id || "-"}</td>
          <td>${obterNomeCliente(conta)}</td>
          <td>${conta.descricao || "-"}</td>
          <td>${formatarMoeda(valor)}</td>
          <td>${formatarData(conta.data_vencimento)}</td>
          <td>${criarBadgeStatus(status)}</td>
        </tr>
      `;
    }).join("");

    totalReceberEl.textContent = formatarMoeda(totalReceber);
    totalPagoEl.textContent = formatarMoeda(totalPago);
    totalPendenteEl.textContent = formatarMoeda(totalPendente);

    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar contas a receber.";
  }
}

document.addEventListener("DOMContentLoaded", carregarContasReceber);