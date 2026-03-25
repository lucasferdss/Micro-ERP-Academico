async function fazerLogin(event) {
  event.preventDefault();

  const status = document.getElementById("login-status");

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  try {
    status.textContent = "Entrando...";

    await API.post("/api/login", payload);

    status.textContent = "Login realizado com sucesso.";
    window.location.href = "/pages/dashboard";
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Erro ao fazer login.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");

  if (form) {
    form.addEventListener("submit", fazerLogin);
  }
});