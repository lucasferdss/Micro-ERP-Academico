let charts = {};

function aplicarPermissoes(perfilRecebido) {
  const perfil = String(perfilRecebido || "Vendedor").toUpperCase();

  const financeiro = document.querySelector(".sidebar-group");
  const linkEntidades = document.querySelector('a[href="/pages/entidades"]');
  const linkProdutos = document.querySelector('a[href="/pages/produtos"]');
  const linkCompras = document.querySelector('a[href="/pages/compras"]');
  const linkVendas = document.querySelector('a[href="/pages/vendas"]');

  if (perfil === "ADMIN") return;

  if (perfil === "VENDEDOR") {
    if (financeiro) financeiro.style.display = "none";
    if (linkCompras) linkCompras.style.display = "none";
    return;
  }

  if (perfil === "FINANCEIRO") {
    if (linkEntidades) linkEntidades.style.display = "none";
    if (linkProdutos) linkProdutos.style.display = "none";
    if (linkCompras) linkCompras.style.display = "none";
    if (linkVendas) linkVendas.style.display = "none";
    return;
  }

  if (perfil === "ESTOQUE") {
    if (financeiro) financeiro.style.display = "none";
    if (linkEntidades) linkEntidades.style.display = "none";
    if (linkVendas) linkVendas.style.display = "none";
  }
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString("pt-BR");
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function syncUserFields() {
  const nameElement = document.getElementById("user-name");
  const roleElement = document.getElementById("user-role");
  const inlineName = document.getElementById("user-name-inline");
  const inlineRole = document.getElementById("user-role-inline");

  if (inlineName) inlineName.textContent = nameElement?.textContent?.trim() || "usuário";
  if (inlineRole) inlineRole.textContent = roleElement?.textContent?.trim() || "-";
}

async function carregarDashboard() {
  const nomeEl = document.getElementById("user-name");
  const perfilEl = document.getElementById("user-role");
  const statusEl = document.getElementById("dashboard-status");

  try {
    if (statusEl) statusEl.textContent = "Carregando perfil...";

    const resposta = await API.get("/api/me");

    if (!resposta?.authenticated || !resposta?.user) {
      window.location.href = "/pages/login";
      return;
    }

    if (nomeEl) nomeEl.textContent = resposta.user.email || resposta.user.nome || "-";
    if (perfilEl) perfilEl.textContent = resposta.user.perfil || "Vendedor";

    aplicarPermissoes(resposta.user.perfil);
    syncUserFields();

    if (statusEl) statusEl.textContent = "Carregando indicadores...";

    await carregarResumoDashboard();

    if (statusEl) statusEl.textContent = "";
  } catch (error) {
    console.error(error);
    window.location.href = "/pages/login";
  }
}

async function carregarResumoDashboard() {
  try {
    const dados = await API.get("/api/dashboard/resumo");

    setTexto("card-vendas-mes", formatarMoeda(dados.vendas_mes));
    setTexto("card-compras-mes", formatarMoeda(dados.compras_mes));
    setTexto("card-saldo-estimado", formatarMoeda(dados.saldo_estimado));
    setTexto("card-lucro", formatarMoeda(dados.lucro_estimado));
    setTexto("card-contas-receber", formatarMoeda(dados.contas_receber));
    setTexto("card-contas-pagar", formatarMoeda(dados.contas_pagar));
    setTexto("card-produtos-estoque", formatarNumero(dados.produtos_estoque));
    setTexto("card-produtos-vendidos", formatarNumero(dados.produtos_vendidos));
    setTexto("card-baixo-estoque", formatarNumero(dados.baixo_estoque));
    setTexto("card-ticket-medio", formatarMoeda(dados.ticket_medio));
    setTexto("card-impostos", formatarMoeda(dados.impostos_mes));
    setTexto("card-margem", `${Number(dados.margem_lucro || 0).toFixed(2)}%`);

    criarGraficosDashboard(dados);
  } catch (error) {
    console.error("Erro ao carregar /api/dashboard/resumo:", error);
    criarGraficosDashboard(null);
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

function destruirGrafico(nome) {
  if (charts[nome]) {
    charts[nome].destroy();
    charts[nome] = null;
  }
}

function criarChart(nome, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;

  destruirGrafico(nome);
  charts[nome] = new Chart(canvas, config);
}

function criarGraficosDashboard(dados) {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family =
    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.color = "#64748b";

  const fallback = criarFallback();
  const d = dados || fallback;

  const moneyTick = value => "R$ " + Number(value || 0).toLocaleString("pt-BR");

  const baseOptionsMoney = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 18 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: moneyTick },
        grid: { color: "rgba(148, 163, 184, 0.18)" }
      },
      x: { grid: { display: false } }
    }
  };

  const baseOptionsQtd = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 18 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(148, 163, 184, 0.18)" }
      },
      x: { grid: { display: false } }
    }
  };

  criarChart("vendasCompras", "chartVendasCompras", {
    type: "line",
    data: {
      labels: d.grafico_vendas_compras?.labels || [],
      datasets: [
        {
          label: "Vendas",
          data: d.grafico_vendas_compras?.vendas || [],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: "Compras",
          data: d.grafico_vendas_compras?.compras || [],
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.10)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: baseOptionsMoney
  });

  criarChart("estoque", "chartEstoque", {
    type: "doughnut",
    data: {
      labels: d.grafico_estoque_categoria?.labels || [],
      datasets: [
        {
          data: d.grafico_estoque_categoria?.valores || [],
          backgroundColor: ["#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe", "#7c3aed"],
          borderColor: "#ffffff",
          borderWidth: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, padding: 16 }
        }
      }
    }
  });

  criarChart("financeiro", "chartFinanceiro", {
    type: "bar",
    data: {
      labels: d.grafico_financeiro?.labels || ["Entradas", "Saídas", "Saldo"],
      datasets: [
        {
          label: "Financeiro",
          data: d.grafico_financeiro?.valores || [],
          backgroundColor: ["#2563eb", "#ef4444", "#16a34a"],
          borderRadius: 14
        }
      ]
    },
    options: {
      ...baseOptionsMoney,
      plugins: { legend: { display: false } }
    }
  });

  criarChart("movimentacoes", "chartMovimentacoes", {
    type: "bar",
    data: {
      labels: d.grafico_movimentacoes?.labels || [],
      datasets: [
        {
          label: "Entradas",
          data: d.grafico_movimentacoes?.entradas || [],
          backgroundColor: "#2563eb",
          borderRadius: 12
        },
        {
          label: "Saídas",
          data: d.grafico_movimentacoes?.saidas || [],
          backgroundColor: "#93c5fd",
          borderRadius: 12
        }
      ]
    },
    options: baseOptionsQtd
  });

  criarChart("lucro", "chartLucro", {
    type: "line",
    data: {
      labels: d.grafico_lucro?.labels || [],
      datasets: [
        {
          label: "Lucro estimado",
          data: d.grafico_lucro?.valores || [],
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124, 58, 237, 0.12)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: baseOptionsMoney
  });

  criarChart("produtosVendidos", "chartProdutosVendidos", {
    type: "bar",
    data: {
      labels: d.grafico_produtos_vendidos?.labels || [],
      datasets: [
        {
          label: "Quantidade vendida",
          data: d.grafico_produtos_vendidos?.valores || [],
          backgroundColor: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
          borderRadius: 14
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.18)" }
        },
        y: { grid: { display: false } }
      }
    }
  });

  criarChart("contas", "chartContas", {
    type: "bar",
    data: {
      labels: d.grafico_contas?.labels || ["Receber", "Pagar"],
      datasets: [
        {
          label: "Contas",
          data: d.grafico_contas?.valores || [],
          backgroundColor: ["#2563eb", "#ef4444"],
          borderRadius: 14
        }
      ]
    },
    options: {
      ...baseOptionsMoney,
      plugins: { legend: { display: false } }
    }
  });

  criarChart("impostos", "chartImpostos", {
    type: "line",
    data: {
      labels: d.grafico_impostos?.labels || [],
      datasets: [
        {
          label: "Impostos",
          data: d.grafico_impostos?.valores || [],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: baseOptionsMoney
  });

  criarChart("pagamento", "chartPagamento", {
    type: "pie",
    data: {
      labels: d.grafico_pagamento?.labels || [],
      datasets: [
        {
          data: d.grafico_pagamento?.valores || [],
          backgroundColor: ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed"],
          borderColor: "#ffffff",
          borderWidth: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, padding: 16 }
        }
      }
    }
  });

  criarChart("saldo", "chartSaldo", {
    type: "line",
    data: {
      labels: d.grafico_saldo?.labels || [],
      datasets: [
        {
          label: "Saldo",
          data: d.grafico_saldo?.valores || [],
          borderColor: "#16a34a",
          backgroundColor: "rgba(22, 163, 74, 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: baseOptionsMoney
  });

  criarChart("baixoEstoque", "chartBaixoEstoque", {
    type: "bar",
    data: {
      labels: d.grafico_baixo_estoque?.labels || [],
      datasets: [
        {
          label: "Estoque atual",
          data: d.grafico_baixo_estoque?.valores || [],
          backgroundColor: "#ef4444",
          borderRadius: 12
        }
      ]
    },
    options: baseOptionsQtd
  });
}

function criarFallback() {
  return {
    grafico_vendas_compras: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      vendas: [0, 0, 0, 0, 0, 0],
      compras: [0, 0, 0, 0, 0, 0]
    },
    grafico_financeiro: {
      labels: ["Entradas", "Saídas", "Saldo"],
      valores: [0, 0, 0]
    },
    grafico_movimentacoes: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      entradas: [0, 0, 0, 0, 0, 0],
      saidas: [0, 0, 0, 0, 0, 0]
    },
    grafico_estoque_categoria: {
      labels: ["Sem dados"],
      valores: [1]
    },
    grafico_lucro: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      valores: [0, 0, 0, 0, 0, 0]
    },
    grafico_produtos_vendidos: {
      labels: ["Sem vendas"],
      valores: [0]
    },
    grafico_contas: {
      labels: ["Receber", "Pagar"],
      valores: [0, 0]
    },
    grafico_impostos: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      valores: [0, 0, 0, 0, 0, 0]
    },
    grafico_pagamento: {
      labels: ["Sem dados"],
      valores: [1]
    },
    grafico_saldo: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      valores: [0, 0, 0, 0, 0, 0]
    },
    grafico_baixo_estoque: {
      labels: ["Sem dados"],
      valores: [0]
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-link");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", fazerLogout);
  }

  carregarDashboard();

  const userNameNode = document.getElementById("user-name");
  const userRoleNode = document.getElementById("user-role");

  if (userNameNode && userRoleNode) {
    const observer = new MutationObserver(syncUserFields);

    observer.observe(userNameNode, {
      childList: true,
      subtree: true,
      characterData: true
    });

    observer.observe(userRoleNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  syncUserFields();
});