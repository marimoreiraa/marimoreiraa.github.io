const CACHE_NAME = "painel-autonomia-v1";
const ARQUIVOS_INICIAIS = [
  "./",
  "./login/",
  "./admin/",
  "./painel/",
  "./cadastro/",
  "./manifest.json",
  "./static/painel/style.css",
  "./static/admin/admin.css",
  "./static/sounds/sucesso.wav"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_INICIAIS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (evento) => {
  if (new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(caches.match(evento.request).then((resposta) => resposta || fetch(evento.request)));
});