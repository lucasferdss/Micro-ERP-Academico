async function fazerLogin(event) {
  // Impede que o formulário recarregue a página (comportamento padrão irritante do HTML antigo)
  event.preventDefault();

  const status = document.getElementById("login-status");

  // Coleta os dados digitados na Interface (DOM)
  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("senha").value
  };

  try {
    status.textContent = "Entrando...";

    // Envia o login para o servidor e recebe a sessão se estiver correto.
    await API.post("/api/login", payload);

    status.textContent = "Login realizado com sucesso.";
    
    // Regra de Negócio: Redireciona violentamente o usuário para dentro do sistema
    window.location.href = "/pages/dashboard";
  } catch (error) {
    // FALHA! (Senha errada ou usuário não existe)
    console.error(error);
    // Exibe o texto de erro devolvido pelo python na tela do usuário
    status.textContent = error.message || "Erro ao fazer login.";
  }
}

// Ouve o evento de quando o HTML da página termina de carregar
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");

  if (form) {
    // Amarramos o botão "Entrar" à função Javascript fazerLogin()
    form.addEventListener("submit", fazerLogin);
  }
});