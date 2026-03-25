async function carregarDashboard() {
  const nomeEl = document.getElementById("user-name");
  const perfilEl = document.getElementById("user-role");
  const statusEl = document.getElementById("dashboard-status");

  try {
    statusEl.textContent = "Carregando dados do usuário...";

    const resposta = await API.get("/api/me");

    if (!resposta?.authenticated || !resposta?.user) {
      window.location.href = "/pages/login";
      return;
    }

    nomeEl.textContent = resposta.user.nome || "-";
    perfilEl.textContent = resposta.user.perfil || "-";
    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    window.location.href = "/pages/login";
  }
}

async function fazerLogout(event) {
  event.preventDefault();

  try {
    await API.post("/api/logout", {});
  } catch (error) {
    console.error(error);
  } finally {
    window.location.href = "/pages/login";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-link");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", fazerLogout);
  }

  carregarDashboard();
});