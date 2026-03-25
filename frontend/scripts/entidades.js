let entidadeEditandoId = null;
let entidadesCache = [];

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

function limparFormulario() {
  document.getElementById("entidade-form").reset();
  entidadeEditandoId = null;
  document.getElementById("submit-button").textContent = "Salvar";
  document.getElementById("cancel-edit-button").style.display = "none";
}

function iniciarEdicao(id) {
  const entidade = entidadesCache.find((item) => item.id === id);
  if (!entidade) return;

  entidadeEditandoId = id;
  preencherFormulario(entidade);
  document.getElementById("submit-button").textContent = "Atualizar";
  document.getElementById("cancel-edit-button").style.display = "inline-block";
  document.getElementById("form-status").textContent = `Editando entidade #${id}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function alternarStatus(id) {
  const status = document.getElementById("entidades-status");

  try {
    status.textContent = "Atualizando status...";
    await API.patch(`/api/entidades/${id}/toggle`);
    await carregarEntidades();
    status.textContent = "Status atualizado.";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao atualizar status.";
  }
}

async function carregarEntidades() {
  const tbody = document.getElementById("entidades-tbody");
  const status = document.getElementById("entidades-status");

  try {
    status.textContent = "Carregando entidades...";

    const entidades = await API.get("/api/entidades");
    entidadesCache = Array.isArray(entidades) ? entidades : [];

    if (entidadesCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">Nenhuma entidade cadastrada.</td>
        </tr>
      `;
      status.textContent = "";
      return;
    }

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
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar entidades.</td>
      </tr>
    `;
    status.textContent = "Falha ao buscar dados da API.";
  }
}

async function salvarEntidade(event) {
  event.preventDefault();

  const status = document.getElementById("form-status");
  const payload = getPayloadFormulario();

  try {
    if (entidadeEditandoId) {
      status.textContent = "Atualizando entidade...";
      await API.put(`/api/entidades/${entidadeEditandoId}`, payload);
      status.textContent = "Entidade atualizada com sucesso.";
    } else {
      status.textContent = "Salvando entidade...";
      await API.post("/api/entidades", payload);
      status.textContent = "Entidade cadastrada com sucesso.";
    }

    limparFormulario();
    await carregarEntidades();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao salvar entidade.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entidade-form");
  const cancelBtn = document.getElementById("cancel-edit-button");

  if (form) {
    form.addEventListener("submit", salvarEntidade);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", limparFormulario);
  }

  carregarEntidades();
});

window.iniciarEdicao = iniciarEdicao;
window.alternarStatus = alternarStatus;