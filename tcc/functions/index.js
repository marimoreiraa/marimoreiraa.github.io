/**
 * Cloud Functions do projeto Rotina TEA.
 *
 * Duas funções:
 *
 * 1. enviarLembretesAgendados — roda a cada 1 minuto (Cloud Scheduler).
 *    Procura, entre os dispositivos registrados com papel "participante",
 *    tarefas do dia já no horário e ainda não concluídas, e dispara um
 *    push de lembrete — repetindo a cada 10 minutos enquanto a tarefa
 *    não for concluída (mesma regra que já existia no cliente, só que
 *    agora roda no servidor, então funciona mesmo com o app fechado).
 *
 * 2. notificarConclusaoTarefa — dispara automaticamente sempre que um
 *    documento em "tarefas" é atualizado. Se o novo status for
 *    "concluida" ou "recusada", avisa o(s) dispositivo(s) do cuidador
 *    (papel "cuidador") daquele mesmo uid.
 *
 * Requer plano Blaze (Cloud Functions não roda no plano gratuito Spark).
 * O volume de execução aqui é mínimo (poucas leituras/min, uso de uma
 * família), deve ficar dentro da cota gratuita mensal do Blaze.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { logger } = require("firebase-functions");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const INTERVALO_REPETICAO_MS = 10 * 60 * 1000;

/**
 * Envia uma notificação push para um token específico, tratando o caso
 * de token inválido/expirado (remove o registro do Firestore quando isso
 * acontece, evitando erro repetido nas próximas execuções).
 */
async function enviarPush(token, docId, titulo, corpo, tag) {
  try {
    await messaging.send({
      token,
      notification: { title: titulo, body: corpo },
      data: { tag: tag || "rotina" },
      webpush: {
        fcmOptions: { link: "/painel/" },
      },
    });
  } catch (erro) {
    logger.warn(`Falha ao enviar push para dispositivo ${docId}:`, erro.message);
    if (erro.code === "messaging/registration-token-not-registered") {
      await db.collection("dispositivos").doc(docId).delete();
      logger.info(`Dispositivo ${docId} removido (token inválido/expirado).`);
    }
  }
}

function tarefaConcluidaHoje(tarefa) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  if (!dataFinalizacao) return false;
  const data = dataFinalizacao.toDate ? dataFinalizacao.toDate() : new Date(dataFinalizacao);
  return data.toDateString() === new Date().toDateString();
}

exports.enviarLembretesAgendados = onSchedule(
  { schedule: "every 1 minutes", region: "southamerica-east1", timeZone: "America/Sao_Paulo" },
  async () => {
    const agora = new Date();
    const diaAtual = agora.getDay();
    const horarioAtual = agora.toTimeString().slice(0, 5);

    const dispositivosSnap = await db
      .collection("dispositivos")
      .where("papel", "==", "participante")
      .get();

    if (dispositivosSnap.empty) return;

    for (const dispositivoDoc of dispositivosSnap.docs) {
      const dispositivo = dispositivoDoc.data();
      const { uid, fcmToken } = dispositivo;
      if (!uid || !fcmToken) continue;

      const tarefasSnap = await db.collection("tarefas").where("uid", "==", uid).get();

      const tarefasDoDia = tarefasSnap.docs
        .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .filter((t) => (t.dias || [0, 1, 2, 3, 4, 5, 6]).includes(diaAtual))
        .filter((t) => t.horario <= horarioAtual && !tarefaConcluidaHoje(t))
        .sort((a, b) => a.horario.localeCompare(b.horario));

      const tarefaAtiva = tarefasDoDia[0];
      if (!tarefaAtiva) continue;

      const ultimoLembreteMs = tarefaAtiva.ultimoLembreteEm
        ? tarefaAtiva.ultimoLembreteEm.toMillis()
        : 0;
      if (Date.now() - ultimoLembreteMs < INTERVALO_REPETICAO_MS) continue;

      await enviarPush(
        fcmToken,
        dispositivoDoc.id,
        "Hora da Tarefa!",
        tarefaAtiva.textoInstrucao || tarefaAtiva.titulo,
        `hora-tarefa-${tarefaAtiva.id}`
      );

      await tarefaAtiva.ref.update({ ultimoLembreteEm: Timestamp.now() });
    }
  }
);

exports.notificarConclusaoTarefa = onDocumentUpdated(
  { document: "tarefas/{tarefaId}", region: "southamerica-east1" },
  async (evento) => {
    const antes = evento.data.before.data();
    const depois = evento.data.after.data();

    const statusMudouParaFinalizado =
      antes.status !== depois.status && ["concluida", "recusada"].includes(depois.status);
    if (!statusMudouParaFinalizado) return;

    const cuidadoresSnap = await db
      .collection("dispositivos")
      .where("uid", "==", depois.uid)
      .where("papel", "==", "cuidador")
      .get();

    if (cuidadoresSnap.empty) return;

    const acao = depois.status === "recusada" ? "recusada" : "concluída";
    const promessas = cuidadoresSnap.docs.map((d) =>
      enviarPush(
        d.data().fcmToken,
        d.id,
        "Atualização de Rotina",
        `A tarefa "${depois.titulo}" foi ${acao}!`,
        `rotina-${evento.params.tarefaId}`
      )
    );

    await Promise.all(promessas);
  }
);
