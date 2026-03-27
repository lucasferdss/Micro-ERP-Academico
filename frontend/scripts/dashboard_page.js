async function carregarDashboard() {
  // Captura as "bóias" (elementos do HTML onde vamos injetar texto)
  const nomeEl = document.getElementById("user-name");
  const perfilEl = document.getElementById("user-role");
  const statusEl = document.getElementById("dashboard-status");

  try {
    statusEl.textContent = "Carregando perfil...";

    // Pede pro Python (rota /api/me) confirmar as credenciais
    const resposta = await API.get("/api/me");

    // Validação de Segurança (Guardião da Rota)
    // Se o backend disser que o cookie não existe ou expirou, chuta o usuário pra tela de Login!
    if (!resposta?.authenticated || !resposta?.user) {
      window.location.href = "/pages/login";
      return;
    }

    // Preenche o HTML visual com os dados que o Banco de Dados retornou
    nomeEl.textContent = resposta.user.email || resposta.user.nome || "-";
    perfilEl.textContent = resposta.user.perfil || "Admin"; // Regra de negócio: Assume 'Admin' temporariamente
    statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    window.location.href = "/pages/login"; // Qualquer falha gravíssima joga de volta pro Login
  }
}

async function fazerLogout(event) {
  event.preventDefault();

  try {
    // Avisa pro Backend apagar o cookie que mantinha a sessão viva
    await API.post("/api/logout", {});
  } catch (error) {
    console.error(error);
  } finally {
    // Independente de travar ou não, sempre volta pra página de Login para limpar o estado visual
    window.location.href = "/pages/login";
  }
}

// Quando a página Dashboard inteira termina de ser lida pelo navegador, esse bloco desperta:
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-link");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", fazerLogout);
  }

  carregarDashboard(); // Inicializa carregamento
});


// Sincroniza o nome do usuário em outros pontos da tela sempre que o elemento principal 'user-name' for alterado.
const syncUserFields = () => {
  const nameElement = document.getElementById("user-name");
  const roleElement = document.getElementById("user-role");
  const inlineName = document.getElementById("user-name-inline");
  const inlineRole = document.getElementById("user-role-inline");

  if(!inlineName || !inlineRole) return; // Prevenção contra quebras caso o HTML mude

  const name = nameElement?.textContent?.trim() || "usuário";
  const role = roleElement?.textContent?.trim() || "-";

  inlineName.textContent = name;
  inlineRole.textContent = role;
};

// Configura o vigilante (Observer)
const userNameNode = document.getElementById("user-name");
const userRoleNode = document.getElementById("user-role");

if (userNameNode && userRoleNode) {
  const observer = new MutationObserver(syncUserFields);
  observer.observe(userNameNode, { childList: true, subtree: true, characterData: true });
  observer.observe(userRoleNode, { childList: true, subtree: true, characterData: true });
}

// Força uma sincronização na primeira abertura de aba
syncUserFields();
