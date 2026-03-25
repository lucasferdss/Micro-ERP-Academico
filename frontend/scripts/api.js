const API = {
  async request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(payload?.error || `Erro ${response.status} em ${url}`);
    }

    return payload;
  },

  get(url) {
    return this.request(url, { method: "GET" });
  },

  post(url, data) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  put(url, data) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  patch(url, data = null) {
    return this.request(url, {
      method: "PATCH",
      ...(data ? { body: JSON.stringify(data) } : {})
    });
  }
};