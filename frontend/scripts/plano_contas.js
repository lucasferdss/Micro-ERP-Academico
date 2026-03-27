// Memória temporária da tela
let contaEditandoId = null;
let contasCache = [];

// Lê os dados do formulário e monta o JSON da conta.
function getPayloadConta() {
  return {
    codigo: document.getElementById("codigo").value.trim(),
    nome: document.getElementById("nome").value.trim(),
    tipo_conta: document.getElementById("tipo_conta").value.trim(),
    natureza: document.getElementById("natureza").value.trim(),
    // Regra: Se a conta pai estiver vazia, devolve null ao invés de string vazia
    conta_pai_id: document.getElementById("conta_pai_id").value || null,
    aceita_lancamento: document.getElementById("aceita_lancamento").checked
  };
}

// Preenche o formulário com os dados para edição.
function preencherFormulario(conta) {
  document.getElementById("codigo").value = conta.codigo || "";
  document.getElementById("nome").value = conta.nome || "";
  document.getElementById("tipo_conta").value = conta.tipo_conta || "";
  document.getElementById("natureza").value = conta.natureza || "";
  document.getElementById("conta_pai_id").value = conta.conta_pai_id || "";
  // Checkbox (Boolean) usa a prioridade `.checked` ao invés de `.value`
  document.getElementById("aceita_lancamento").checked = !!conta.aceita_lancamento;
}

// Limpa o formulário da conta e fecha o painel.
function limparFormularioConta() {
  document.getElementById("plano-conta-form").reset();
  
  // Regra de interface: checkbox volta ativado por padrão
  document.getElementById("aceita_lancamento").checked = true;
  
  contaEditandoId = null;
  document.getElementById("submit-button").textContent = "Salvar";
  document.getElementById("cancel-edit-button").style.display = "none";
  const panel = document.getElementById("account-form-panel");
  if (panel) panel.classList.add("hidden");
}

// Atualiza as opções do select de conta pai, excluindo a própria conta da lista.
function atualizarSelectContaPai() {
  const select = document.getElementById("conta_pai_id");
  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `
    <option value="">Sem conta pai</option>
    ${contasCache
      // Filtra tirando a conta atual (não pode ser pai de si mesma, geraria um ciclo infinito)
      .filter((conta) => conta.id !== contaEditandoId)
      // Constrói a lista de tags <option> para o HTML
      .map((conta) => `<option value="${conta.id}">${conta.codigo} - ${conta.nome}</option>`)
      .join("")}
  `;

  if (valorAtual) {
    select.value = valorAtual;
  }
}

// Inicia a edição da conta selecionada.
function iniciarEdicaoConta(id) {
  // Caça a conta na lista já carregada da memória
  const conta = contasCache.find((item) => item.id === id);
  if (!conta) return;

  // Seta a edição
  contaEditandoId = id;
  
  // Expande gaveta, atualiza as opções do Pai e então preenche com os dados velhos
  openAccountForm(true);
  atualizarSelectContaPai();
  preencherFormulario(conta);
  
  // Feedback visual (botão Atualizar em vez de Salvar)
  document.getElementById("submit-button").textContent = "Atualizar";
  document.getElementById("cancel-edit-button").style.display = "inline-block";
  document.getElementById("form-status").textContent = `Editando conta #${id}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Alterna o status ativo da conta.
async function alternarStatusConta(id) {
  const status = document.getElementById("plano-contas-status");

  try {
    status.textContent = "Atualizando status...";
    // PATCH é o verbo HTTP especializado em atualizações cirúrgicas/parciais
    await API.patch(`/api/plano-contas/${id}/toggle`);
    
    await carregarPlanoContas();
    status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao atualizar status.";
  }
}

// Carrega o plano de contas e atualiza a tabela na tela.
async function carregarPlanoContas() {
  const tbody = document.getElementById("plano-contas-tbody");
  const status = document.getElementById("plano-contas-status");

  try {
    status.textContent = "Carregando contas...";

    // Obtém dados fresquinhos do Banco
    const contas = await API.get("/api/plano-contas");
    contasCache = Array.isArray(contas) ? contas : [];

    // Refaz as opções do formulário toda vez que baixar contas novas
    atualizarSelectContaPai();

    if (contasCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma conta cadastrada.</td></tr>`;
      status.textContent = "";
      return;
    }

    // Regra Visual do Pai: Se tiver conta_pai encadeada trazida do backend, mostra concatendo o codigo - nome. Senão mostra "-"
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
    tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar plano de contas.</td></tr>`;
    status.textContent = "Falha ao buscar dados da API.";
  }
}

// Salva a conta do plano pelo formulário.
async function salvarPlanoConta(event) {
  event.preventDefault(); // Breca o navegador de dar um Reload bruto na página

  const status = document.getElementById("form-status");
  const payload = getPayloadConta();

  try {
    // Decisão: Foi botão Atualizar ou botão Cadastrar Novo?
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

// Inicia escutando se os botões existem e atribui as tarefas
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("plano-conta-form");
  const cancelBtn = document.getElementById("cancel-edit-button");

  if (form) form.addEventListener("submit", salvarPlanoConta);
  if (cancelBtn) cancelBtn.addEventListener("click", limparFormularioConta);

  carregarPlanoContas();
});

// Tornando funções disponíveis no Escopo Raiz (Window) para o HTML acessá-las
window.iniciarEdicaoConta = iniciarEdicaoConta;
window.alternarStatusConta = alternarStatusConta;

// Controle de abertura e fechamento do formulário.
const newAccountButton = document.getElementById("new-account-button");
const accountFormPanel = document.getElementById("account-form-panel");
const planoContaForm = document.getElementById("plano-conta-form");
const cancelEditButton = document.getElementById("cancel-edit-button");
const submitButton = document.getElementById("submit-button");
const formStatus = document.getElementById("form-status");
const aceitaLancamento = document.getElementById("aceita_lancamento");

function openAccountForm(isEdit = false) {
  if (!accountFormPanel) return;

  // Mostra a Gaveta
  accountFormPanel.classList.remove("hidden");

  // Novo Cadastro joga vazio em tudo
  if (!isEdit && planoContaForm) {
    planoContaForm.reset();
    if (aceitaLancamento) aceitaLancamento.checked = true;
  }

  if (submitButton && !isEdit) submitButton.textContent = "Salvar conta";
  if (formStatus && !isEdit) formStatus.textContent = "Formulário pronto para um novo cadastro.";

  const firstField = document.getElementById("codigo");
  if (firstField) firstField.focus(); // Joga o cursor piscando pra primeira linha
}

function closeAccountForm() {
  if (!accountFormPanel) return;

  // Esconde a Gaveta
  accountFormPanel.classList.add("hidden");

  if (planoContaForm) planoContaForm.reset();
  if (aceitaLancamento) aceitaLancamento.checked = true;

  if (submitButton) submitButton.textContent = "Salvar conta";
  if (formStatus) formStatus.textContent = "";
}

// Ouve os cliques dos botões que não estão em repetição na tabela
if (newAccountButton) newAccountButton.addEventListener("click", () => openAccountForm(false));
if (cancelEditButton) cancelEditButton.addEventListener("click", () => closeAccountForm());

window.openAccountForm = openAccountForm;
window.closeAccountForm = closeAccountForm;
