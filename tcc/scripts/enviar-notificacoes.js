/**
 * Envio de notificações push — versão gratuita (sem Cloud Functions).
 *
 * Roda como um script Node.js comum, disparado periodicamente pelo
 * GitHub Actions (ver .github/workflows/notificacoes.yml), em vez de
 * rodar como Cloud Function do Firebase — isso evita a exigência do
 * plano Blaze, porque aqui só estamos usando o Admin SDK (leitura/escrita
 * no Firestore + envio de mensagens FCM), que são gratuitos por si só.
 * O que custa dinheiro no Firebase é especificamente o Cloud Scheduler
 * por trás de uma Cloud Function agendada — então tiramos o Scheduler
 * do Firebase e usamos o cron gratuito do GitHub Actions no lugar.
 *
 * Faz duas coisas em cada execução:
 *   1. Lembrete: para dispositivos "participante", verifica se há
 *      tarefa no horário e ainda não concluída, e reenvia a cada 10min.
 *   2. Aviso ao cuidador: verifica tarefas concluídas/recusadas que
 *      ainda não geraram aviso, e notifica o(s) dispositivo(s) "cuidador".
 *
 * Credenciais: espera a variável de ambiente FIREBASE_SERVICE_ACCOUNT
 * contendo o JSON completo da conta de serviço (gerada no Console do
 * Firebase -> Configurações do projeto -> Contas de serviço -> Gerar
 * nova chave privada). No GitHub Actions, isso vem de um Secret.
 */

const admin = require("firebase-admin");

const credencialJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!credencialJson) {
  console.error("Variável de ambiente FIREBASE_SERVICE_ACCOUNT não definida.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(credencialJson)),
});

const db = admin.firestore();
const messaging = admin.messaging();

const INTERVALO_REPETICAO_MS = 10 * 60 * 1000;

async function enviarPush(token, docId, titulo, corpo, tag) {
  try {
    await messaging.send({
      token,
      notification: { title: titulo, body: corpo },
      data: { tag: tag || "rotina" },
      webpush: { fcmOptions: { link: "/painel/" } },
    });
    console.log(`Push enviado (${docId}): ${titulo}`);
  } catch (erro) {
    console.warn(`Falha ao enviar push para ${docId}:`, erro.message);
    if (erro.code === "messaging/registration-token-not-registered") {
      await db.collection("dispositivos").doc(docId).delete();
      console.log(`Dispositivo ${docId} removido (token inválido/expirado).`);
    }
  }
}

function tarefaConcluidaHoje(tarefa) {
  const dataFinalizacao = tarefa.statusEm || tarefa.concluidaEm;
  if (!dataFinalizacao) return false;
  const data = dataFinalizacao.toDate ? dataFinalizacao.toDate() : new Date(dataFinalizacao);
  return data.toDateString() === new Date().toDateString();
}

async function processarLembretesParticipante() {
  const agora = new Date();
  const diaAtual = agora.getDay();
  const horarioAtual = agora.toTimeString().slice(0, 5);

  const dispositivosSnap = await db
    .collection("dispositivos")
    .where("papel", "==", "participante")
    .get();

  for (const dispositivoDoc of dispositivosSnap.docs) {
    const { uid, fcmToken } = dispositivoDoc.data();
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

    await tarefaAtiva.ref.update({ ultimoLembreteEm: admin.firestore.Timestamp.now() });
  }
}

async function processarAvisosCuidador() {
  const tarefasSnap = await db
    .collection("tarefas")
    .where("status", "in", ["concluida", "recusada"])
    .get();

  for (const tarefaDoc of tarefasSnap.docs) {
    const tarefa = { id: tarefaDoc.id, ...tarefaDoc.data() };

    if (!tarefaConcluidaHoje(tarefa)) continue;

    // Compara timestamps em vez de usar um booleano fixo: como a tarefa
    // é recorrente (mesmo documento, todo dia), um booleano "já avisei"
    // ficaria travado em true para sempre depois do primeiro dia. Com
    // timestamp, cada nova conclusão (statusEm mais recente que o último
    // aviso enviado) gera um novo aviso corretamente.
    const statusEmMs = tarefa.statusEm?.toMillis?.() || 0;
    const ultimoAvisoMs = tarefa.notificacaoCuidadorEnviadaEm?.toMillis?.() || 0;
    if (ultimoAvisoMs >= statusEmMs) continue;

    const cuidadoresSnap = await db
      .collection("dispositivos")
      .where("uid", "==", tarefa.uid)
      .where("papel", "==", "cuidador")
      .get();

    const acao = tarefa.status === "recusada" ? "recusada" : "concluída";
    await Promise.all(
      cuidadoresSnap.docs.map((d) =>
        enviarPush(
          d.data().fcmToken,
          d.id,
          "Atualização de Rotina",
          `A tarefa "${tarefa.titulo}" foi ${acao}!`,
          `rotina-${tarefa.id}`
        )
      )
    );

    await tarefaDoc.ref.update({ notificacaoCuidadorEnviadaEm: admin.firestore.Timestamp.now() });
  }
}

async function main() {
  await processarLembretesParticipante();
  await processarAvisosCuidador();
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("Erro ao processar notificações:", erro);
    process.exit(1);
  });
