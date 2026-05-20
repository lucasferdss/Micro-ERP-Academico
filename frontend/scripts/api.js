const API = {
  async request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = response.headers.get("content-type") || "";

    let payload = null;

    try {
      payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.error ||
        payload?.erro ||
        payload?.mensagem ||
        payload?.message ||
        (typeof payload === "string" ? payload : null) ||
        `Erro ${response.status} em ${url}`;

      throw new Error(message);
    }

    return payload;
  },

  get(url) {
    return this.request(url, {
      method: "GET",
    });
  },

  post(url, data) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(url, data) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  patch(url, data = null) {
    return this.request(url, {
      method: "PATCH",
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  },

  delete(url) {
    return this.request(url, {
      method: "DELETE",
    });
  },
};