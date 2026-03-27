// Memória temporária da tela
let entidadeEditandoId = null; // Guarda o ID da entidade se o usuário estiver editando. Se for nulo, é um cadastro novo.
let entidadesCache = [];       // Guarda a lista de entidades para não precisarmos ir no banco toda hora que clicar em "Editar"

// Lê os campos do formulário e monta o JSON para enviar ao backend.
function getPayloadFormulario() {
  return {
    tipo_entidade: document.getElementById("tipo_entidade").value.trim(),
    nome_razao_social: document.getElementById("nome_razao_social").value.trim(),
    nome_fantasia: document.getElementById("nome_fantasia").value.trim(),
    cpf_cnpj: document.getElementById("cpf_cnpj").value.trim(),
    inscricao_estadual: document.getElementById("inscricao_estadual").value.trim(),
    email: document.getElementById("email").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    cep: document.getElementById("cep").value.trim(),
    logradouro: document.getElementById("logradouro").value.trim(),
    numero: document.getElementById("numero").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    uf: document.getElementById("uf").value.trim()
  };
}

// Preenche o formulário com os dados da entidade para edição.
function preencherFormulario(entidade) {
  document.getElementById("tipo_entidade").value = entidade.tipo_entidade || "";
  document.getElementById("nome_razao_social").value = entidade.nome_razao_social || "";
  document.getElementById("nome_fantasia").value = entidade.nome_fantasia || "";
  document.getElementById("cpf_cnpj").value = entidade.cpf_cnpj || "";
  document.getElementById("inscricao_estadual").value = entidade.inscricao_estadual || "";
  document.getElementById("email").value = entidade.email || "";
  document.getElementById("telefone").value = entidade.telefone || "";
  document.getElementById("cep").value = entidade.cep || "";
  document.getElementById("logradouro").value = entidade.logradouro || "";
  document.getElementById("numero").value = entidade.numero || "";
  document.getElementById("bairro").value = entidade.bairro || "";
  document.getElementById("cidade").value = entidade.cidade || "";
  document.getElementById("uf").value = entidade.uf || "";
}

// Limpa o formulário, reseta a edição e fecha o painel lateral.
function limparFormulario() {
  document.getElementById("entidade-form").reset();
  entidadeEditandoId = null; // Garante que o sistema saiba que o próximo "Salvar" será um cadastro novo
  document.getElementById("submit-button").textContent = "Salvar";
  document.getElementById("cancel-edit-button").style.display = "none";
  
  // Oculta o painel inteiro após salvar/cancelar
  const panel = document.getElementById("entity-form-panel");
  if (panel) panel.classList.add("hidden");
}

// Inicia a edição do registro pelo id.
function iniciarEdicao(id) {
  // Busca o registro na memória Cache (aquela lista que varremos na abertura da tela)
  const entidade = entidadesCache.find((item) => item.id === id);
  if (!entidade) return;

  // Define o modo do sistema como "Modo Edição"
  entidadeEditandoId = id;
  
  // Mostra o formulário escondido
  openEntityForm(true);
  
  // Joga os dados nos inputs
  preencherFormulario(entidade);
  
  // Atualiza a estética dos botões
  document.getElementById("submit-button").textContent = "Atualizar";
  document.getElementById("cancel-edit-button").style.display = "inline-block";
  document.getElementById("form-status").textContent = `Editando entidade #${id}`;
  
  // Rola a tela graciosamente para o topo onde está o formulário
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Alterna o status ativo/inativo do registro.
async function alternarStatus(id) {
  const status = document.getElementById("entidades-status");

  try {
    status.textContent = "Atualizando status...";
    // Envia o pedido pra rota PATCH (Update Parcial) no Python
    await API.patch(`/api/entidades/${id}/toggle`);
    
    // Sucesso! Recarrega a tabela para mostrar o novo botão
    await carregarEntidades();
    status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao atualizar status.";
  }
}

// Carrega a lista de entidades e monta as linhas da tabela na tela.
async function carregarEntidades() {
  const tbody = document.getElementById("entidades-tbody");
  const status = document.getElementById("entidades-status");

  try {
    status.textContent = "Carregando entidades...";

    // Busca os dados na API Segura (O Python fará o SELECT no Supabase)
    const entidades = await API.get("/api/entidades");
    // Guarda a resposta no Cache Global da tela
    entidadesCache = Array.isArray(entidades) ? entidades : [];

    // Tratativa: Se o banco estiver vazio...
    if (entidadesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">Nenhuma entidade cadastrada.</td></tr>`;
      status.textContent = "";
      return;
    }

    // "Renderização". Desenha as linhas <tr> dinamicamente usando Templates String (`...`)
    tbody.innerHTML = entidadesCache.map((entidade) => `
      <tr>
        <td>${entidade.id}</td>
        <td>${entidade.tipo_entidade ?? "-"}</td>
        <td>${entidade.nome_razao_social ?? "-"}</td>
        <td>${entidade.cpf_cnpj ?? "-"}</td>
        <td>${entidade.email ?? "-"}</td>
        <td>${entidade.telefone ?? "-"}</td>
        <td>${entidade.ativo ? "Ativo" : "Inativo"}</td>
        <td>
          <button type="button" class="btn-secondary" onclick="iniciarEdicao(${entidade.id})">Editar</button>
          <button type="button" class="btn-secondary" onclick="alternarStatus(${entidade.id})">
            ${entidade.ativo ? "Desativar" : "Ativar"}
          </button>
        </td>
      </tr>
    `).join("");

    status.textContent = "";
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar entidades.</td></tr>`;
    status.textContent = "Falha ao buscar dados da API.";
  }
}

// Salva a entidade com POST ou PUT conforme o modo do formulário.
async function salvarEntidade(event) {
  event.preventDefault(); // Impede f5 na página

  const status = document.getElementById("form-status");
  const payload = getPayloadFormulario();

  try {
    // Regra de Negócio: Se a variável 'entidadeEditandoId' estiver preenchida, é uma Edição
    if (entidadeEditandoId) {
      status.textContent = "Atualizando entidade...";
      await API.put(`/api/entidades/${entidadeEditandoId}`, payload);
      status.textContent = "Entidade atualizada com sucesso.";
    } 
    // Se não, é uma Inserção nova (Cadastro)
    else {
      status.textContent = "Salvando entidade...";
      await API.post("/api/entidades", payload);
      status.textContent = "Entidade cadastrada com sucesso.";
    }

    // Passo Final: Sucesso absoluto! Recolhe o formulário e recarrega a tabela atualizada
    limparFormulario();
    await carregarEntidades();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao salvar entidade.";
  }
}

// Roda quando o HTML da página termina de carregar.
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entidade-form");
  const cancelBtn = document.getElementById("cancel-edit-button");

  // Amarramos as funções aos cliques dos botões
  if (form) form.addEventListener("submit", salvarEntidade);
  if (cancelBtn) cancelBtn.addEventListener("click", limparFormulario);

  // Gatilho inicial: Carrega a tabela assim que a tela abre
  carregarEntidades();
});

// Como transformamos isso de script inline em um arquivo modular,
// precisamos colar essas funções na "Janela do Navegador" (window) para que o "onclick=..." do HTML ainda as ache.
window.iniciarEdicao = iniciarEdicao;
window.alternarStatus = alternarStatus;

// CONTROLE DE INTERFACE (UI) DO PAINEL LATERAL
const newEntityButton = document.getElementById("new-entity-button");
const entityFormPanel = document.getElementById("entity-form-panel");
const entidadeForm = document.getElementById("entidade-form");
const cancelEditButton = document.getElementById("cancel-edit-button");
const submitButton = document.getElementById("submit-button");
const formStatus = document.getElementById("form-status");

// Abre (Expande) o Painel Oculto
function openEntityForm(isEdit = false) {
  if (!entityFormPanel) return;
  
  // Tira a capa de invisibilidade
  entityFormPanel.classList.remove("hidden");

  // Se for Cadastro Novo, garante que todos os campos estão limpos
  if (!isEdit && entidadeForm) entidadeForm.reset();
  if (submitButton && !isEdit) submitButton.textContent = "Salvar entidade";
  if (formStatus && !isEdit) formStatus.textContent = "Formulário pronto para um novo cadastro.";

  // Foca o mouse automaticamente no primeiro campo para agilizar a digitação
  const firstField = document.getElementById("tipo_entidade");
  if (firstField) firstField.focus();
}

// Esconde (Fecha) o Painel
function closeEntityForm() {
  if (!entityFormPanel) return;
  entityFormPanel.classList.add("hidden");

  if (entidadeForm) entidadeForm.reset();
  if (submitButton) submitButton.textContent = "Salvar entidade";
  if (formStatus) formStatus.textContent = "";
}

// Botões fixos do Topo (Novo Cadastro) e Rodapé (Fechar)
if (newEntityButton) {
  newEntityButton.addEventListener("click", () => {
    openEntityForm(false);
  });
}

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", () => {
    closeEntityForm();
  });
}

window.openEntityForm = openEntityForm;
window.closeEntityForm = closeEntityForm;
