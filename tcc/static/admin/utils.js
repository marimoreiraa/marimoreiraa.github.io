function ehArquivoHeic(arquivo) {
  return (
    /\.(heic|heif)$/i.test(arquivo.name) ||
    arquivo.type === "image/heic" ||
    arquivo.type === "image/heif"
  );
}

function nomeArquivoJpeg(nome) {
  return nome.replace(/\.(heic|heif)$/i, ".jpg");
}

function tarefaFinalizadaHoje(tarefa, hoje = new Date()) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  return dataFinalizacao && new Date(dataFinalizacao).toDateString() === hoje.toDateString();
}

const adminUtils = { ehArquivoHeic, nomeArquivoJpeg, tarefaFinalizadaHoje };

if (typeof module !== "undefined" && module.exports) {
  module.exports = adminUtils;
} else {
  globalThis.AdminUtils = adminUtils;
}
