// Хранит сайт на телефоне, чтобы он открывался без интернета.
const CACHE = 'plov-5e68b98d47';
const FILES = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'tg.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  // Шрифты не меняются: сначала копия. Сайт: сначала свежая версия, без сети копия.
  if (isFont) {
    e.respondWith(caches.match(req).then(hit => hit || fetchAndKeep(req)));
  } else {
    e.respondWith(fetchAndKeep(req).catch(() =>
      caches.match(req).then(hit => hit || caches.match('./'))));
  }
});
function fetchAndKeep(req) {
  return fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
}
