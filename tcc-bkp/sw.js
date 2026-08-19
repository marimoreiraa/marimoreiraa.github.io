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