const API = {

  async request(url, options = {}) {
    // Chama a API do navegador para ir até a internet (ou localhost)
    const response = await fetch(url, {
      credentials: "include", // Garante que o cookie de sessão vá junto na requisição!
      headers: {
        "Accept": "application/json",
        // Se estiver mandando arquivos/texto no "body", diz que o formato é JSON
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    // Analisa a resposta física do Servidor
    const contentType = response.headers.get("content-type") || "";
    // Se o servidor devolveu JSON (que é o nosso padrão), extrai os dados. Senão, fica vazio.
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    // Tratamento de Erros (Se o Python devolveu 400, 401, 500...)
    if (!response.ok) {
        // Se a requisição falhou, "quebra" a execução devolvendo o erro lá do Python
      throw new Error(payload?.error || `Erro ${response.status} em ${url}`);
    }

    // Retorna os dados com sucesso para a tela que pediu
    return payload;
  },

  // GET: Usado para "Ler/Listar" dados do servidor
  get(url) {
    return this.request(url, { method: "GET" });
  },

  // POST: Usado para "Criar/Salvar" novos dados
  post(url, data) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // PUT: Usado para "Atualizar/Sobrescrever" dados existentes
  put(url, data) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // PATCH: Usado para "Alterações Rápidas" (ex: Ativar/Inativar um registro)
  patch(url, data = null) {
    return this.request(url, {
      method: "PATCH",
      ...(data ? { body: JSON.stringify(data) } : {})
    });
  }
};