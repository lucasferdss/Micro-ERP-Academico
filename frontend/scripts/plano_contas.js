let contaEditandoId = null;
let contasCache = [];

function getPayloadConta() {
  return {
    codigo: document.getElementById("codigo").value.trim(),
    nome: document.getElementById("nome").value.trim(),
    tipo_conta: document.getElementById("tipo_conta").value.trim(),
    natureza: document.getElementById("natureza").value.trim(),
    conta_pai_id: document.getElementById("conta_pai_id").value || null,
    aceita_lancamento: document.getElementById("aceita_lancamento").checked
  };
}

function preencherFormulario(conta) {
  document.getElementById("codigo").value = conta.codigo || "";
  document.getElementById("nome").value = conta.nome || "";
  document.getElementById("tipo_conta").value = conta.tipo_conta || "";
  document.getElementById("natureza").value = conta.natureza || "";
  document.getElementById("conta_pai_id").value = conta.conta_pai_id || "";
  document.getElementById("aceita_lancamento").checked = !!conta.aceita_lancamento;
}

function limparFormularioConta() {
  document.getElementById("plano-conta-form").reset();
  document.getElementById("aceita_lancamento").checked = true;
  contaEditandoId = null;
  document.getElementById("submit-button").textContent = "Salvar";
  document.getElementById("cancel-edit-button").style.display = "none";
}

function atualizarSelectContaPai() {
  const select = document.getElementById("conta_pai_id");
  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `
    <option value="">Sem conta pai</option>
    ${contasCache
      .filter((conta) => conta.id !== contaEditandoId)
      .map((conta) => `<option value="${conta.id}">${conta.codigo} - ${conta.nome}</option>`)
      .join("")}
  `;

  if (valorAtual) {
    select.value = valorAtual;
  }
}

function iniciarEdicaoConta(id) {
  const conta = contasCache.find((item) => item.id === id);
  if (!conta) return;

  contaEditandoId = id;
  atualizarSelectContaPai();
  preencherFormulario(conta);
  document.getElementById("submit-button").textContent = "Atualizar";
  document.getElementById("cancel-edit-button").style.display = "inline-block";
  document.getElementById("form-status").textContent = `Editando conta #${id}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function alternarStatusConta(id) {
  const status = document.getElementById("plano-contas-status");

  try {
    status.textContent = "Atualizando status...";
    await API.patch(`/api/plano-contas/${id}/toggle`);
    await carregarPlanoContas();
    status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao atualizar status.";
  }
}

async function carregarPlanoContas() {
  const tbody = document.getElementById("plano-contas-tbody");
  const status = document.getElementById("plano-contas-status");

  try {
    status.textContent = "Carregando contas...";

    const contas = await API.get("/api/plano-contas");
    contasCache = Array.isArray(contas) ? contas : [];

    atualizarSelectContaPai();

    if (contasCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Nenhuma conta cadastrada.</td>
        </tr>
      `;
      status.textContent = "";
      return;
    }

    tbody.innerHTML = contasCache.map((conta) => `
      <tr>
        <td>${conta.codigo ?? "-"}</td>
        <td>${conta.nome ?? "-"}</td>
        <td>${conta.tipo_conta ?? "-"}</td>
        <td>${conta.natureza ?? "-"}</td>
        <td>${conta.conta_pai ? `${conta.conta_pai.codigo} - ${conta.conta_pai.nome}` : "-"}</td>
        <td>${conta.aceita_lancamento ? "Sim" : "Não"}</td>
        <td>${conta.ativo ? "Ativo" : "Inativo"}</td>
        <td>
          <button type="button" class="btn-secondary" onclick="iniciarEdicaoConta(${conta.id})">Editar</button>
          <button type="button" class="btn-secondary" onclick="alternarStatusConta(${conta.id})">
            ${conta.ativo ? "Desativar" : "Ativar"}
          </button>
        </td>
      </tr>
    `).join("");

    status.textContent = "";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar plano de contas.</td>
      </tr>
    `;
    status.textContent = "Falha ao buscar dados da API.";
  }
}

async function salvarPlanoConta(event) {
  event.preventDefault();

  const status = document.getElementById("form-status");
  const payload = getPayloadConta();

  try {
    if (contaEditandoId) {
      status.textContent = "Atualizando conta...";
      await API.put(`/api/plano-contas/${contaEditandoId}`, payload);
      status.textContent = "Conta atualizada com sucesso.";
    } else {
      status.textContent = "Salvando conta...";
      await API.post("/api/plano-contas", payload);
      status.textContent = "Conta cadastrada com sucesso.";
    }

    limparFormularioConta();
    await carregarPlanoContas();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao salvar conta.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("plano-conta-form");
  const cancelBtn = document.getElementById("cancel-edit-button");

  if (form) {
    form.addEventListener("submit", salvarPlanoConta);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", limparFormularioConta);
  }

  carregarPlanoContas();
});

window.iniciarEdicaoConta = iniciarEdicaoConta;
window.alternarStatusConta = alternarStatusConta;