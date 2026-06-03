function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarData(data) {
  if (!data) return "-";

  const dataLimpa = String(data).split("T")[0];
  const partes = dataLimpa.split("-");

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterNomeCliente(conta) {
  const cliente = conta.cliente || conta.entidade || {};

  return (
    cliente.nome_razao_social ||
    cliente.nome_fantasia ||
    cliente.email ||
    conta.cliente_nome ||
    conta.entidade_nome ||
    "-"
  );
}

function obterReferenciaVenda(conta) {
  return (
    conta.numero_documento ||
    conta.descricao ||
    (conta.venda_id ? `Venda #${conta.venda_id}` : null) ||
    (conta.pedido_venda_id ? `Venda #${conta.pedido_venda_id}` : null) ||
    "-"
  );
}

function obterValorConta(conta) {
  return Number(
    conta.valor_original ||
    conta.valor ||
    conta.total ||
    0
  );
}

function criarBadgeStatus(status) {
  const statusNormalizado = String(status || "ABERTO").toUpperCase();

  if (
    statusNormalizado === "PAGO" ||
    statusNormalizado === "RECEBIDO" ||
    statusNormalizado === "QUITADO" ||
    statusNormalizado === "QUITADA"
  ) {
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
    if (statusEl) statusEl.textContent = "Carregando contas a receber...";

    const contas = await API.get("/api/contas-receber");

    if (!Array.isArray(contas) || contas.length === 0) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">Nenhuma conta a receber encontrada.</td>
          </tr>
        `;
      }

      if (totalReceberEl) totalReceberEl.textContent = formatarMoeda(0);
      if (totalPagoEl) totalPagoEl.textContent = formatarMoeda(0);
      if (totalPendenteEl) totalPendenteEl.textContent = formatarMoeda(0);
      if (statusEl) statusEl.textContent = "";

      return;
    }

    let totalReceber = 0;
    let totalPago = 0;
    let totalPendente = 0;

    if (tbody) {
      tbody.innerHTML = contas.map((conta) => {
        const valor = obterValorConta(conta);
        const valorRecebido = Number(conta.valor_recebido || 0);
        const status = String(conta.status || "ABERTO").toUpperCase();

        totalReceber += valor;

        if (
          status === "PAGO" ||
          status === "RECEBIDO" ||
          status === "QUITADO" ||
          status === "QUITADA"
        ) {
          totalPago += valorRecebido > 0 ? valorRecebido : valor;
        } else {
          totalPendente += valor - valorRecebido;
        }

        return `
          <tr>
            <td>${conta.id}</td>
            <td>${obterReferenciaVenda(conta)}</td>
            <td>${obterNomeCliente(conta)}</td>
            <td>${conta.descricao || "-"}</td>
            <td>${formatarMoeda(valor)}</td>
            <td>${formatarData(conta.data_vencimento)}</td>
            <td>${criarBadgeStatus(status)}</td>
          </tr>
        `;
      }).join("");
    }

    if (totalReceberEl) totalReceberEl.textContent = formatarMoeda(totalReceber);
    if (totalPagoEl) totalPagoEl.textContent = formatarMoeda(totalPago);
    if (totalPendenteEl) totalPendenteEl.textContent = formatarMoeda(totalPendente);

    if (statusEl) statusEl.textContent = "";
  } catch (error) {
    console.error(error);

    if (statusEl) {
      statusEl.textContent = "Erro ao carregar contas a receber.";
    }
  }
}

document.addEventListener("DOMContentLoaded", carregarContasReceber);