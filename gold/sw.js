/* Service worker: permite instalar la página como app y abrirla sin conexión */
const CACHE = 'portafolio-1792338493';
const PRECACHE = ["./", "index.html", "en/index.html", "assets/catalog/astronauta.webp", "assets/catalog/axolotl.webp", "assets/catalog/bruja.webp", "assets/catalog/esqueleto-articulado.webp", "assets/catalog/estuche-dino.webp", "assets/catalog/panda.webp", "assets/catalog/pareja-chibi.webp", "assets/catalog/shiba.webp", "assets/css/styles.css", "assets/img/favicon.svg", "assets/img/icon-192.png", "assets/img/icon-512.png", "assets/img/og-image.png", "assets/js/app.js", "assets/js/catalog.js", "assets/js/chat.js", "assets/js/contact.js", "assets/js/i18n.en.js", "assets/js/i18n.es.js", "assets/js/projects.js", "assets/js/stl.js", "assets/js/tools.js"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') {           // páginas: red primero, caché si no hay conexión
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
});
