// Guarda os arquivos para o app abrir sem internet. Ao publicar mudança, suba o número da VERSAO.
const VERSAO = 'etiqueta-quadro-v2';
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'css/app.css', 'vendor/jspdf.umd.min.js', 'js/dados.js', 'js/norma.js', 'js/logo.js', 'js/icones.js', 'js/desenho.js', 'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('etiqueta-quadro-') && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); e.waitUntil(caches.open(VERSAO).then(c => c.put(e.request, copia))); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
