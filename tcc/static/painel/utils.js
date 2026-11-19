function tarefaConcluidaHoje(tarefa, hoje = new Date()) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  return dataFinalizacao && new Date(dataFinalizacao).toDateString() === hoje.toDateString();
}

function selecionarTarefaAtiva(tarefas, diaAtual, horarioAtual) {
  return tarefas
    .filter((item) => (item.dias || [0, 1, 2, 3, 4, 5, 6]).includes(diaAtual))
    .filter((item) => item.horario <= horarioAtual && !tarefaConcluidaHoje(item))
    .sort((a, b) => a.horario.localeCompare(b.horario))[0];
}

const painelUtils = { tarefaConcluidaHoje, selecionarTarefaAtiva };

if (typeof module !== "undefined" && module.exports) {
  module.exports = painelUtils;
} else {
  globalThis.PainelUtils = painelUtils;
}
