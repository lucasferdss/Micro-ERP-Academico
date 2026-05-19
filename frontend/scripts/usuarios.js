async function carregarUsuarios() {
  const tbody = document.getElementById("usuarios-tbody");

  try {
    const usuarios = await API.get("/api/usuarios");

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4">Nenhum usuário vinculado.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = usuarios.map((item) => {
      const perfil = item.perfil || {};

      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.user_id}</td>
          <td><strong>${perfil.nome || "-"}</strong></td>
          <td>${item.ativo ? "Sim" : "Não"}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error(error);

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
  const userId = document.getElementById("user_id").value.trim();
  const perfil = document.getElementById("perfil").value;

  if (!userId || !perfil) {
    statusEl.textContent = "Informe o User ID e o perfil.";
    return;
  }

  try {
    statusEl.textContent = "Salvando perfil...";

    await API.post("/api/usuarios/perfil", {
      user_id: userId,
      perfil
    });

    statusEl.textContent = "Perfil salvo com sucesso.";
    form.reset();

    await carregarUsuarios();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Erro ao salvar perfil.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarUsuarios();

  const form = document.getElementById("usuario-form");
  const limparBtn = document.getElementById("limpar-form");

  if (form) {
    form.addEventListener("submit", salvarPerfil);
  }

  if (limparBtn) {
    limparBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("usuario-status").textContent = "";
    });
  }
});