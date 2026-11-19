import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import "./metricas.js";

const auth = window.auth;
const db = window.db;
const {
  obterIdentificacaoParticipante,
  extrairDataHora,
  obterTurno,
  calcularDiferencaMinutos,
  calcularMetricas,
} = globalThis.Metricas;

const btnSair = document.getElementById("btn-sair");
const btnExportarCsv = document.getElementById("btn-exportar-csv");
const metricTotal = document.getElementById("metric-total");
const metricConclusao = document.getElementById("metric-conclusao");
const metricRecusa = document.getElementById("metric-recusa");
const metricOmissao = document.getElementById("metric-omissao");
const metricAudio = document.getElementById("metric-audio");
const metricDiferenca = document.getElementById("metric-diferenca");
const tabelaGargalosBody = document.getElementById("tabela-gargalos-body");
const historicoLogsBody = document.getElementById("historico-logs-body");
const filtroParticipante = document.getElementById("filtro-participante");

const EMAIL_PESQUISADORA = "0076895@academico.ifmg.edu.br";
const CHAVE_LOGS = "logs_pesquisa";

let todosLogsPesquisa = [];
let logsPesquisa = [];
let filtroAtual = "GERAL";

// Instâncias do Chart.js
let graficoStatus = null;
let graficoModo = null;
let graficoTurno = null;

function escapeHtml(texto) {
  if (texto === null || texto === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}

async function carregarLogsPesquisa() {
  try {
    const logsRef = collection(db, CHAVE_LOGS);
    const snapshot = await getDocs(logsRef);
    todosLogsPesquisa = snapshot.docs
      .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
      .sort((a, b) => {
        const aTime = a.timestampReal?.seconds ?? 0;
        const bTime = b.timestampReal?.seconds ?? 0;
        return bTime - aTime;
      });

    atualizarOpcoesFiltroParticipante();
    aplicarFiltroParticipante();
  } catch (erro) {
    console.error("Erro ao carregar logs da pesquisa:", erro);
    historicoLogsBody.innerHTML = '<tr><td colspan="8" class="linha-vazia">Não foi possível carregar os dados.</td></tr>';
  }
}

function atualizarOpcoesFiltroParticipante() {
  const emailsUnicos = [...new Set(todosLogsPesquisa
    .map((log) => obterIdentificacaoParticipante(log))
    .filter(Boolean))];

  const opcoes = ["<option value=\"GERAL\">Consolidado geral</option>"];
  emailsUnicos.forEach((email) => {
    opcoes.push(`<option value="${escapeHtml(email)}">${escapeHtml(email)}</option>`);
  });

  filtroParticipante.innerHTML = opcoes.join("");
  filtroParticipante.value = filtroAtual && filtroAtual !== "GERAL" && emailsUnicos.includes(filtroAtual) ? filtroAtual : "GERAL";
  filtroAtual = filtroParticipante.value;
}

function aplicarFiltroParticipante() {
  if (filtroAtual === "GERAL") {
    logsPesquisa = [...todosLogsPesquisa];
  } else {
    logsPesquisa = todosLogsPesquisa.filter((log) => {
      const email = obterIdentificacaoParticipante(log);
      return email === filtroAtual;
    });
  }

  renderizarEstatisticas();
}

function renderizarEstatisticas() {
  const metrica = calcularMetricas(logsPesquisa);

  metricTotal.textContent = String(metrica.total);
  metricConclusao.textContent = `${metrica.taxaConclusao.toFixed(1)}%`;
  metricRecusa.textContent = `${metrica.taxaRecusa.toFixed(1)}%`;
  metricOmissao.textContent = `${metrica.taxaOmissao.toFixed(1)}%`;
  metricAudio.textContent = String(metrica.totalAudio);
  metricDiferenca.textContent = `${Math.round(metrica.diferencaMedia)}`;

  // Destruir gráficos anteriores para evitar sobreposição
  if (graficoStatus) {
    graficoStatus.destroy();
    graficoStatus = null;
  }
  if (graficoModo) {
    graficoModo.destroy();
    graficoModo = null;
  }
  if (graficoTurno) {
    graficoTurno.destroy();
    graficoTurno = null;
  }

  // 1. Gráfico de Rosca: Status (Concluídas, Recusadas, Omitidas)
  const canvasStatus = document.getElementById("grafico-status");
  if (canvasStatus) {
    graficoStatus = new Chart(canvasStatus, {
      type: "doughnut",
      data: {
        labels: ["Concluídas", "Recusadas", "Omitidas"],
        datasets: [{
          data: [metrica.concluidas, metrica.recusadas, metrica.omitidas],
          backgroundColor: ["#22A06B", "#E85D75", "#E2A100"],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
          },
        },
      },
    });
  }

  // 2. Gráfico de Barras: Comparativo por Modo (Fixo vs Pessoal)
  const canvasModo = document.getElementById("grafico-modo");
  if (canvasModo) {
    graficoModo = new Chart(canvasModo, {
      type: "bar",
      data: {
        labels: ["Modo Fixo", "Modo Pessoal"],
        datasets: [
          {
            label: "Concluídas",
            data: [metrica.modo.Fixo.concluidas, metrica.modo.Pessoal.concluidas],
            backgroundColor: "#22A06B",
            borderRadius: 6,
          },
          {
            label: "Recusadas",
            data: [metrica.modo.Fixo.recusadas, metrica.modo.Pessoal.recusadas],
            backgroundColor: "#E85D75",
            borderRadius: 6,
          },
          {
            label: "Omitidas",
            data: [metrica.modo.Fixo.omitidas, metrica.modo.Pessoal.omitidas],
            backgroundColor: "#E2A100",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
          },
        },
      },
    });
  }

  // 3. Gráfico de Barras: Taxa / Quantidade por Turno
  const canvasTurno = document.getElementById("grafico-turno");
  if (canvasTurno) {
    graficoTurno = new Chart(canvasTurno, {
      type: "bar",
      data: {
        labels: ["Manhã", "Tarde", "Noite"],
        datasets: [
          {
            label: "Concluídas",
            data: [metrica.turno.Manha.concluidas, metrica.turno.Tarde.concluidas, metrica.turno.Noite.concluidas],
            backgroundColor: "#22A06B",
            borderRadius: 6,
          },
          {
            label: "Recusadas",
            data: [metrica.turno.Manha.recusadas, metrica.turno.Tarde.recusadas, metrica.turno.Noite.recusadas],
            backgroundColor: "#E85D75",
            borderRadius: 6,
          },
          {
            label: "Omitidas",
            data: [metrica.turno.Manha.omitidas, metrica.turno.Tarde.omitidas, metrica.turno.Noite.omitidas],
            backgroundColor: "#E2A100",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
          },
        },
      },
    });
  }

  renderizarTabelaGargalos(metrica.topGargalos);
  renderizarTabelaLogs();
}

function renderizarTabelaGargalos(topGargalos) {
  if (!tabelaGargalosBody) return;

  if (!topGargalos || !topGargalos.length) {
    tabelaGargalosBody.innerHTML = '<tr><td colspan="4" class="linha-vazia">Nenhum dado de latência disponível.</td></tr>';
    return;
  }

  tabelaGargalosBody.innerHTML = topGargalos
    .map((item, index) => {
      const pos = index + 1;
      return `
        <tr>
          <td><span class="badge-posicao top-${pos}">${pos}º</span></td>
          <td><strong>${escapeHtml(item.nomeTarefa)}</strong></td>
          <td>${Math.round(item.latenciaMedia)} min</td>
          <td>${item.totalExecucoes}</td>
        </tr>
      `;
    })
    .join("");
}

function renderizarTabelaLogs() {
  if (!logsPesquisa.length) {
    historicoLogsBody.innerHTML = '<tr><td colspan="8" class="linha-vazia">Nenhum dado de pesquisa disponível.</td></tr>';
    return;
  }

  historicoLogsBody.innerHTML = logsPesquisa
    .map((log) => {
      const dataHora = extrairDataHora(log.timestampReal) || new Date();
      const dataFormatada = !isNaN(dataHora.getTime())
        ? dataHora.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
        : "-";

      const participante = obterIdentificacaoParticipante(log);
      const turno = obterTurno(log.horarioPrevisto, log.timestampReal);
      const audioAtivado = (log.usoAudio === true || log.usoAudio === "true" || log.audio === true) ? "Sim 🔊" : "Não";

      return `
        <tr>
          <td>${escapeHtml(participante)}</td>
          <td>${escapeHtml(dataFormatada)}</td>
          <td>${escapeHtml(log.nomeTarefa || "-")}</td>
          <td>${escapeHtml(log.modoUso || "-")}</td>
          <td>${escapeHtml(log.horarioPrevisto || "-")}</td>
          <td>${escapeHtml(log.acao || "-")}</td>
          <td>${escapeHtml(audioAtivado)}</td>
          <td>${escapeHtml(turno)}</td>
        </tr>
      `;
    })
    .join("");
}

function exportarCsv() {
  if (!logsPesquisa.length) return;

  const colunas = [
    "Participante/Email",
    "Data/Hora",
    "Tarefa",
    "Modo",
    "Horário Previsto",
    "Ação",
    "Uso de Áudio",
    "Turno",
    "Diferença Minutos",
  ];

  const linhas = logsPesquisa.map((log) => {
    const dataHora = extrairDataHora(log.timestampReal) || new Date();
    const dataIso = !isNaN(dataHora.getTime()) ? dataHora.toISOString() : "";
    const participante = obterIdentificacaoParticipante(log);
    const turno = obterTurno(log.horarioPrevisto, log.timestampReal);
    const audio = (log.usoAudio === true || log.usoAudio === "true" || log.audio === true) ? "Sim" : "Não";
    const diff = calcularDiferencaMinutos(log);
    const diffTexto = diff !== null ? String(Math.round(diff)) : "";

    return [
      participante,
      dataIso,
      log.nomeTarefa || "",
      log.modoUso || "",
      log.horarioPrevisto || "",
      log.acao || "",
      audio,
      turno,
      diffTexto,
    ];
  });

  const csv = [colunas, ...linhas]
    .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "logs-pesquisa-tea-ihc.csv";
  a.click();
  URL.revokeObjectURL(url);
}

if (btnSair) {
  btnSair.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.replace("../login/");
    } catch (erro) {
      console.error("Erro ao sair:", erro);
    }
  });
}

if (filtroParticipante) {
  filtroParticipante.addEventListener("change", (evento) => {
    filtroAtual = evento.target.value;
    aplicarFiltroParticipante();
  });
}

if (btnExportarCsv) {
  btnExportarCsv.addEventListener("click", exportarCsv);
}

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.replace("../login/");
    return;
  }

  if (usuario.email !== EMAIL_PESQUISADORA) {
    window.location.replace("../login/");
    return;
  }

  carregarLogsPesquisa();
});
