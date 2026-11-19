const FUSO_HORARIO = "America/Sao_Paulo";

const formatadorDataLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

function obterDataHoraLocal(data = new Date()) {
  const partes = Object.fromEntries(
    formatadorDataLocal.formatToParts(data).map(({ type, value }) => [type, value])
  );
  const diasDaSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    dia: diasDaSemana[partes.weekday],
    horario: `${partes.hour}:${partes.minute}`,
  };
}

function base64url(bytesOuTexto) {
  const bytes =
    typeof bytesOuTexto === "string" ? new TextEncoder().encode(bytesOuTexto) : bytesOuTexto;
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function firestoreParaObjeto(campos) {
  const resultado = {};
  for (const [chave, valor] of Object.entries(campos || {})) {
    resultado[chave] = firestoreParaValor(valor);
  }
  return resultado;
}

function firestoreParaValor(valor) {
  if (valor.stringValue !== undefined) return valor.stringValue;
  if (valor.integerValue !== undefined) return parseInt(valor.integerValue, 10);
  if (valor.doubleValue !== undefined) return valor.doubleValue;
  if (valor.booleanValue !== undefined) return valor.booleanValue;
  if (valor.timestampValue !== undefined) return new Date(valor.timestampValue);
  if (valor.arrayValue !== undefined) return (valor.arrayValue.values || []).map(firestoreParaValor);
  if (valor.nullValue !== undefined) return null;
  return null;
}

function valorParaFirestore(valor) {
  if (valor instanceof Date) return { timestampValue: valor.toISOString() };
  if (typeof valor === "string") return { stringValue: valor };
  if (typeof valor === "boolean") return { booleanValue: valor };
  if (typeof valor === "number") return { doubleValue: valor };
  return { nullValue: null };
}

function tarefaConcluidaHoje(tarefa, agora = new Date()) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  if (!dataFinalizacao) return false;
  const data = dataFinalizacao instanceof Date ? dataFinalizacao : new Date(dataFinalizacao);
  return obterDataHoraLocal(data).data === obterDataHoraLocal(agora).data;
}

const workerUtils = {
  obterDataHoraLocal,
  base64url,
  firestoreParaObjeto,
  firestoreParaValor,
  valorParaFirestore,
  tarefaConcluidaHoje,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = workerUtils;
} else {
  globalThis.WorkerUtils = workerUtils;
}
