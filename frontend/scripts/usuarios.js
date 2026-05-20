async function carregarUsuarios() {
  const tbody = document.getElementById("usuarios-tbody");

  if (!tbody) return;

  try {
    tbody.innerHTML = `
      <tr>
        <td colspan="4">Carregando usuários...</td>
      </tr>
    `;

    const usuarios = await API.get("/api/usuarios");

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">Nenhum usuário vinculado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = usuarios
      .map((item) => {
        const perfil = item.perfil || {};

        return `
          <tr>
            <td>${item.id || "-"}</td>
            <td>${item.user_id || "-"}</td>
            <td><strong>${perfil.nome || "-"}</strong></td>
            <td>${item.ativo ? "Sim" : "Não"}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="4">Erro ao carregar usuários.</td>
      </tr>
    `;
  }
}

async function salvarPerfil(event) {
  event.preventDefault();

  const statusEl = document.getElementById("usuario-status");
  const form = document.getElementById("usuario-form");
  const userIdInput = document.getElementById("user_id");
  const perfilInput = document.getElementById("perfil");

  if (!statusEl || !form || !userIdInput || !perfilInput) return;

  const userId = userIdInput.value.trim();
  const perfil = perfilInput.value.trim();

  if (!userId || !perfil) {
    statusEl.textContent = "Informe o User ID e o perfil.";
    return;
  }

  try {
    statusEl.textContent = "Salvando perfil...";

    const resposta = await API.post("/api/usuarios/perfil", {
      user_id: userId,
      perfil: perfil,
    });

    statusEl.textContent =
      resposta?.mensagem || "Perfil salvo com sucesso.";

    form.reset();

    await carregarUsuarios();
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);

    statusEl.textContent =
      error?.message ||
      error?.erro ||
      "Erro ao salvar perfil.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarUsuarios();

  const form = document.getElementById("usuario-form");
  const limparBtn = document.getElementById("limpar-form");
  const statusEl = document.getElementById("usuario-status");

  if (form) {
    form.addEventListener("submit", salvarPerfil);
  }

  if (limparBtn) {
    limparBtn.addEventListener("click", () => {
      if (form) form.reset();
      if (statusEl) statusEl.textContent = "";
    });
  }
});