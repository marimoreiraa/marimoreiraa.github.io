function obterIdentificacaoParticipante(log) {
  const email = log.emailParticipante || log.email || log.usuarioEmail || log.emailUsuario;
  if (email && typeof email === "string" && email.trim()) {
    return email.trim();
  }
  return log.idUsuario || log.uid || "Email não informado";
}

function converterHorarioParaMinutos(horario) {
  if (typeof horario !== "string" || !/^\d{2}:\d{2}$/.test(horario)) return null;
  const [hora, minuto] = horario.split(":").map(Number);
  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
  return (hora * 60) + minuto;
}

function converterTimestampParaMinutos(timestamp) {
  if (!timestamp) return null;
  let data = null;
  if (typeof timestamp.toDate === "function") {
    data = timestamp.toDate();
  } else if (typeof timestamp.seconds === "number") {
    data = new Date(timestamp.seconds * 1000);
  } else {
    data = new Date(timestamp);
  }
  if (!data || isNaN(data.getTime())) return null;
  return (data.getHours() * 60) + data.getMinutes();
}

function extrairDataHora(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

function obterTurno(horarioPrevisto, timestampReal) {
  const minutosPrevistos = converterHorarioParaMinutos(horarioPrevisto);
  let hora = minutosPrevistos === null ? null : Math.floor(minutosPrevistos / 60);

  if (hora === null && timestampReal) {
    const data = extrairDataHora(timestampReal);
    if (data && !isNaN(data.getTime())) hora = data.getHours();
  }

  if (hora === null) return "Indefinido";
  if (hora >= 5 && hora < 12) return "Manhã";
  if (hora >= 12 && hora < 18) return "Tarde";
  return "Noite";
}

function normalizarModo(modo) {
  if (!modo) return "Não especificado";
  const m = String(modo).toLowerCase().trim();
  if (m.includes("fixo")) return "Fixo";
  if (m.includes("pessoal")) return "Pessoal";
  return modo;
}

function calcularDiferencaMinutos(log) {
  if (!log.horarioPrevisto || !log.timestampReal) return null;
  const minutosPrevisto = converterHorarioParaMinutos(log.horarioPrevisto);
  const minutosReal = converterTimestampParaMinutos(log.timestampReal);
  if (minutosPrevisto === null || minutosReal === null) return null;
  return Math.abs(minutosReal - minutosPrevisto);
}

function calcularMetricas(logsPesquisa) {
  const total = logsPesquisa.length;
  const concluidas = logsPesquisa.filter((log) => log.acao === "Concluida").length;
  const recusadas = logsPesquisa.filter((log) => log.acao === "Recusada").length;
  const omitidas = logsPesquisa.filter((log) => log.acao === "Omitida").length;

  const taxaConclusao = total ? (concluidas / total) * 100 : 0;
  const taxaRecusa = total ? (recusadas / total) * 100 : 0;
  const taxaOmissao = total ? (omitidas / total) * 100 : 0;
  const totalAudio = logsPesquisa.filter((log) => log.usoAudio === true || log.usoAudio === "true" || log.audio === true).length;

  const diferencasValidas = [];
  logsPesquisa.forEach((log) => {
    const diff = calcularDiferencaMinutos(log);
    if (diff !== null) diferencasValidas.push(diff);
  });

  const diferencaMedia = diferencasValidas.length
    ? diferencasValidas.reduce((soma, valor) => soma + valor, 0) / diferencasValidas.length
    : 0;

  const modo = {
    Fixo: { concluidas: 0, recusadas: 0, omitidas: 0, total: 0 },
    Pessoal: { concluidas: 0, recusadas: 0, omitidas: 0, total: 0 },
  };

  const turno = {
    Manha: { concluidas: 0, recusadas: 0, omitidas: 0, total: 0 },
    Tarde: { concluidas: 0, recusadas: 0, omitidas: 0, total: 0 },
    Noite: { concluidas: 0, recusadas: 0, omitidas: 0, total: 0 },
  };

  const tarefasMap = new Map();

  logsPesquisa.forEach((log) => {
    const modoNorm = normalizarModo(log.modoUso);
    if (modo[modoNorm]) {
      modo[modoNorm].total += 1;
      if (log.acao === "Concluida") modo[modoNorm].concluidas += 1;
      else if (log.acao === "Recusada") modo[modoNorm].recusadas += 1;
      else if (log.acao === "Omitida") modo[modoNorm].omitidas += 1;
    }

    const t = obterTurno(log.horarioPrevisto, log.timestampReal);
    const chaveTurno = t === "Manhã" ? "Manha" : (t === "Tarde" ? "Tarde" : (t === "Noite" ? "Noite" : null));
    if (chaveTurno && turno[chaveTurno]) {
      turno[chaveTurno].total += 1;
      if (log.acao === "Concluida") turno[chaveTurno].concluidas += 1;
      else if (log.acao === "Recusada") turno[chaveTurno].recusadas += 1;
      else if (log.acao === "Omitida") turno[chaveTurno].omitidas += 1;
    }

    const nomeTarefa = (log.nomeTarefa || "Tarefa sem nome").trim();
    const diff = calcularDiferencaMinutos(log);
    if (!tarefasMap.has(nomeTarefa)) {
      tarefasMap.set(nomeTarefa, { nomeTarefa, somaLatencia: 0, contagemLatencia: 0, totalExecucoes: 0 });
    }
    const itemTarefa = tarefasMap.get(nomeTarefa);
    itemTarefa.totalExecucoes += 1;
    if (diff !== null) {
      itemTarefa.somaLatencia += diff;
      itemTarefa.contagemLatencia += 1;
    }
  });

  const topGargalos = Array.from(tarefasMap.values())
    .filter((item) => item.contagemLatencia > 0)
    .map((item) => ({
      nomeTarefa: item.nomeTarefa,
      latenciaMedia: item.somaLatencia / item.contagemLatencia,
      totalExecucoes: item.totalExecucoes,
    }))
    .sort((a, b) => b.latenciaMedia - a.latenciaMedia)
    .slice(0, 5);

  return {
    total,
    concluidas,
    recusadas,
    omitidas,
    taxaConclusao,
    taxaRecusa,
    taxaOmissao,
    totalAudio,
    diferencaMedia,
    modo,
    turno,
    topGargalos,
  };
}

const metricas = {
  obterIdentificacaoParticipante,
  converterHorarioParaMinutos,
  converterTimestampParaMinutos,
  extrairDataHora,
  obterTurno,
  normalizarModo,
  calcularDiferencaMinutos,
  calcularMetricas,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = metricas;
} else {
  globalThis.Metricas = metricas;
}
