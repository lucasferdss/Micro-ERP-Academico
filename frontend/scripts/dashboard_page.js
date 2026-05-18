async function carregarDashboard() {
  const nomeEl = document.getElementById("user-name");
  const perfilEl = document.getElementById("user-role");
  const statusEl = document.getElementById("dashboard-status");

  try {
    if (statusEl) {
      statusEl.textContent = "Carregando perfil...";
    }

    const resposta = await API.get("/api/me");

    if (!resposta?.authenticated || !resposta?.user) {
      window.location.href = "/pages/login";
      return;
    }

    if (nomeEl) {
      nomeEl.textContent = resposta.user.email || resposta.user.nome || "-";
    }

    if (perfilEl) {
      perfilEl.textContent = resposta.user.perfil || "Admin";
    }

    if (statusEl) {
      statusEl.textContent = "";
    }

    syncUserFields();
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

function syncUserFields() {
  const nameElement = document.getElementById("user-name");
  const roleElement = document.getElementById("user-role");
  const inlineName = document.getElementById("user-name-inline");
  const inlineRole = document.getElementById("user-role-inline");

  if (inlineName) {
    inlineName.textContent = nameElement?.textContent?.trim() || "usuário";
  }

  if (inlineRole) {
    inlineRole.textContent = roleElement?.textContent?.trim() || "-";
  }
}

function criarGraficosDashboard() {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family =
    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.color = "#64748b";

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

  const chartVendasCompras = document.getElementById("chartVendasCompras");
  if (chartVendasCompras) {
    new Chart(chartVendasCompras, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Vendas",
            data: [8500, 12300, 9800, 15100, 17400, 18450],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: "Compras",
            data: [5200, 7800, 6900, 8900, 9300, 9820],
            borderColor: "#16a34a",
            backgroundColor: "rgba(22, 163, 74, 0.10)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 18
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => "R$ " + value.toLocaleString("pt-BR")
            },
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  const chartEstoque = document.getElementById("chartEstoque");
  if (chartEstoque) {
    new Chart(chartEstoque, {
      type: "doughnut",
      data: {
        labels: ["Eletrônicos", "Acessórios", "Peças", "Serviços"],
        datasets: [
          {
            data: [95, 72, 54, 27],
            backgroundColor: ["#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"],
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
            labels: {
              usePointStyle: true,
              padding: 16
            }
          }
        }
      }
    });
  }

  const chartFinanceiro = document.getElementById("chartFinanceiro");
  if (chartFinanceiro) {
    new Chart(chartFinanceiro, {
      type: "bar",
      data: {
        labels: ["Entradas", "Saídas", "Saldo"],
        datasets: [
          {
            label: "Financeiro",
            data: [18450, 9820, 8630],
            backgroundColor: ["#2563eb", "#ef4444", "#16a34a"],
            borderRadius: 14
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => "R$ " + value.toLocaleString("pt-BR")
            },
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  const chartMovimentacoes = document.getElementById("chartMovimentacoes");
  if (chartMovimentacoes) {
    new Chart(chartMovimentacoes, {
      type: "bar",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Entradas",
            data: [42, 58, 47, 64, 71, 80],
            backgroundColor: "#2563eb",
            borderRadius: 12
          },
          {
            label: "Saídas",
            data: [30, 45, 39, 50, 63, 69],
            backgroundColor: "#93c5fd",
            borderRadius: 12
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 18
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  const chartLucro = document.getElementById("chartLucro");
  if (chartLucro) {
    new Chart(chartLucro, {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          {
            label: "Lucro estimado",
            data: [3300, 4500, 2900, 6200, 8100, 8630],
            borderColor: "#7c3aed",
            backgroundColor: "rgba(124, 58, 237, 0.12)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 18
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => "R$ " + value.toLocaleString("pt-BR")
            },
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  const chartProdutosVendidos = document.getElementById("chartProdutosVendidos");
  if (chartProdutosVendidos) {
    new Chart(chartProdutosVendidos, {
      type: "bar",
      data: {
        labels: ["Produto 01", "Produto 02", "Produto 03", "Produto 04"],
        datasets: [
          {
            label: "Quantidade vendida",
            data: [86, 64, 52, 38],
            backgroundColor: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
            borderRadius: 14
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-link");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", fazerLogout);
  }

  carregarDashboard();
  criarGraficosDashboard();

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