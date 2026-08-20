/* ============================================================
   Registro de dispositivo para notificações push (FCM).

   Usado tanto pelo painel (papel "participante", só quando o
   modo de exibição é "pessoal") quanto pelo admin (papel
   "cuidador", sempre).

   Cada dispositivo autenticado salva/atualiza um documento na
   coleção "dispositivos", contendo o token FCM atual — é esse
   token que as Cloud Functions usam para saber pra onde mandar
   a notificação.

   IMPORTANTE: para isso funcionar, é preciso gerar uma "chave
   VAPID" no Console do Firebase (Configurações do projeto ->
   Cloud Messaging -> Web Push certificates -> Gerar par de
   chaves) e colar abaixo em VAPID_KEY. Sem isso, getToken()
   sempre falha.
   ============================================================ */

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const VAPID_KEY = "BPTeX9hrah39CuzwAZRhoS50p9hDMsK6mu5oozRAJ45ceQZlOGFOfhejirV1DyCJyw5cbeAbptZVKfsXXv_jHsE";

/**
 * Solicita permissão de notificação, obtém o token FCM deste dispositivo/
 * navegador, e salva/atualiza o documento correspondente no Firestore.
 *
 * @param {import('firebase/app').FirebaseApp} app - instância já inicializada
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid - uid do cuidador autenticado (dono da conta)
 * @param {"participante"|"cuidador"} papel - qual lado deste dispositivo
 * @returns {Promise<string|null>} o token salvo, ou null se falhou/negado
 */
export async function registrarDispositivoPush(app, db, uid, papel) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("Este navegador não suporta notificações push.");
    return null;
  }

  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      console.warn("Permissão de notificação não concedida.");
      return null;
    }

    // O módulo fica em /tcc/static/shared e o Service Worker em /tcc/sw.js.
    // Usar URL relativa ao módulo evita quebrar no GitHub Pages, cujo site
    // é servido dentro do subcaminho /tcc/.
    const urlSW = new URL("../../sw.js", import.meta.url);
    const registroSW = await navigator.serviceWorker.register(urlSW);

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registroSW,
    });

    if (!token) {
      console.warn("Não foi possível obter o token FCM.");
      return null;
    }

    // Um documento por combinação uid+papel+token evita duplicados quando
    // o mesmo dispositivo registra de novo (ex.: reabriu o app).
    const idDocumento = `${uid}_${papel}`;
    await setDoc(
      doc(db, "dispositivos", idDocumento),
      {
        uid,
        papel,
        fcmToken: token,
        atualizadoEm: serverTimestamp(),
      },
      { merge: true }
    );

    // Notificações recebidas com o app em primeiro plano não passam pelo
    // Service Worker — tratamos aqui pra também aparecer nesse caso.
    onMessage(messaging, (payload) => {
      const titulo = payload.data?.titulo || payload.notification?.title || "Rotina";
      const corpo = payload.data?.corpo || payload.notification?.body || "";
      window.dispatchEvent(new CustomEvent("tarefa-notificacao", { detail: payload }));
      // No modo pessoal, a tela aberta já mostra a tarefa e toca seu áudio.
      if (papel === "participante" && document.visibilityState === "visible") return;
      if (Notification.permission === "granted") {
        registroSW.showNotification(titulo, { body: corpo, icon: "./icone.png" });
      }
    });

    return token;
  } catch (erro) {
    console.error("Erro ao registrar dispositivo para push:", erro);
    return null;
  }
}
