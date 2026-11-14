/* Service worker: permite instalar la página como app y abrirla sin conexión */
const CACHE = 'portafolio-1794664232';
const PRECACHE = ["./", "index.html", "en/index.html", "assets/catalog/astronauta.webp", "assets/catalog/axolotl.webp", "assets/catalog/bruja.webp", "assets/catalog/duelo-gran-jefe.webp", "assets/catalog/esqueleto-articulado.webp", "assets/catalog/estuche-dino.webp", "assets/catalog/final-boss-pursuit.webp", "assets/catalog/panda.webp", "assets/catalog/pareja-chibi.webp", "assets/catalog/shiba.webp", "assets/changelog.json", "assets/css/styles.css", "assets/img/cato-bank.json", "assets/img/favicon-32.png", "assets/img/favicon.svg", "assets/img/icon-192.png", "assets/img/icon-512.png", "assets/img/logo.svg", "assets/img/logo.webp", "assets/img/og-image.png", "assets/img/qr.png", "assets/js/app.js", "assets/js/catalog.js", "assets/js/chat.js", "assets/js/contact.js", "assets/js/csvview.js", "assets/js/cvmanager.js", "assets/js/etl.js", "assets/js/fichas.js", "assets/js/games.js", "assets/js/i18n.en.js", "assets/js/i18n.es.js", "assets/js/maint.js", "assets/js/prod.js", "assets/js/projects.js", "assets/js/quote.js", "assets/js/stl.js", "assets/js/threads.js", "assets/js/tools.js", "assets/js/video.js", "assets/js/vision.js", "assets/projects/academia-tornillos.webp", "assets/projects/bc-factory.webp", "assets/projects/bc-robot.webp", "assets/projects/calc-roscas.webp", "assets/projects/csv-viewer.webp", "assets/projects/dashboard-produccion.webp", "assets/projects/etl-pipeline.webp", "assets/projects/fichas-tecnicas.webp", "assets/projects/hc-ico-asesoria.webp", "assets/projects/hc-ico-auto.webp", "assets/projects/hc-ico-ia.webp", "assets/projects/hc-ico-ml.webp", "assets/projects/hc-ico-robot.webp", "assets/projects/hc-ico-ventas.webp", "assets/projects/linea-produccion.webp", "assets/projects/mantenimiento.webp", "assets/projects/taller-3d-cotizador.webp", "assets/projects/vision-tornillos.webp"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range') || /\.(mp3|m4a|ogg|mp4)$/i.test(u.pathname)) return;
  // Siempre red primero (revalidando con el servidor): así cada publicación llega al navegador
  // sin borrar datos. La caché solo se usa si no hay conexión.
  e.respondWith(
    fetch(r, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
