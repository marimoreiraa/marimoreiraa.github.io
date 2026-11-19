function tarefaConcluidaHoje(tarefa, hoje = new Date()) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  if (!dataFinalizacao) return false;
  const data = dataFinalizacao.toDate ? dataFinalizacao.toDate() : new Date(dataFinalizacao);
  return data.toDateString() === hoje.toDateString();
}

const notificationUtils = { tarefaConcluidaHoje };

if (typeof module !== "undefined" && module.exports) {
  module.exports = notificationUtils;
} else {
  globalThis.NotificationUtils = notificationUtils;
}
