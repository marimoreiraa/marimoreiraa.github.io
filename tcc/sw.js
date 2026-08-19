/* ============================================================
   Firebase Cloud Messaging — notificações em segundo plano.

   Isso é o que faz a notificação aparecer mesmo com o app
   fechado/minimizado e na tela de bloqueio: o disparo vem do
   sistema operacional (via FCM), entregue diretamente para este
   Service Worker, sem depender de nenhuma aba estar aberta.

   Usa os scripts "compat" (não os modulares) porque Service
   Workers ainda têm suporte limitado a import de módulos ES —
   compat via importScripts é o método documentado oficialmente
   pelo Firebase para este cenário.
   ============================================================ */
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCWETQhgszkYUtuADX0SZ14CkxuP_ekz8M",
  authDomain: "rotina-tea.firebaseapp.com",
  projectId: "rotina-tea",
  storageBucket: "rotina-tea.firebasestorage.app",
  messagingSenderId: "153201667136",
  appId: "1:153201667136:web:e0e891c2cd45d29e9703a5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || "Rotina";
  const opcoes = {
    body: payload.notification?.body || "",
    icon: "/icone.png",
    tag: payload.data?.tag || "rotina-push",
    requireInteraction: true,
  };
  self.registration.showNotification(titulo, opcoes);
});

const CACHE_NAME = "painel-autonomia-v2";
const ARQUIVOS_INICIAIS = [
  "./",
  "./login/",
  "./admin/",
  "./painel/",
  "./cadastro/",
  "./manifest.json",
  "./icone.png",
  "./static/painel/style.css",
  "./static/painel/app.js",
  "./static/admin/admin.css",
  "./static/admin/admin.js",
  "./static/sounds/sucesso.wav"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_INICIAIS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  if (new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(caches.match(evento.request).then((resposta) => resposta || fetch(evento.request)));
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientes) => {
      const cliente = clientes.find((item) => "focus" in item);
      return cliente ? cliente.focus() : self.clients.openWindow("./painel/");
    }),
  );
});