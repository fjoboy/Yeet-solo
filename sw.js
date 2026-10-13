const CACHE = 'yeet-solo-grimoire-v2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// Safari refuses redirected responses from a service worker, so store a clean copy.
const clean = r => r.redirected ? r.blob().then(b => new Response(b, {status: 200, headers: r.headers})) : Promise.resolve(r);
const store = (c, path) => fetch(path, {cache: 'reload'}).then(r => r.ok ? clean(r).then(x => c.put(path, x)) : null).catch(() => null);
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => store(c, f)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.postMessage('cached'))));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // Network first so updates arrive; the saved copy when offline.
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) clean(r.clone()).then(x => caches.open(CACHE).then(c => c.put('./index.html', x)));
      return clean(r);
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request)));
});
