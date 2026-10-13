/* Сервис-воркер, совместимый с localhost, GitHub Pages /repo/ и собственным доменом. */
const BASE = self.registration.scope;
const CACHE_PREFIX = 'finance-drive-ui-';
const CACHE = CACHE_PREFIX + 'pages-v3-reconnect-' + new URL(BASE).pathname;
const ASSETS = [
  './', './index.html', './assets/styles.css', './assets/app.js',
  './assets/drive_api.js', './assets/drive_journal.js',
  './assets/google_config.js', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', './manifest.webmanifest'
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Не перехватываем Google API, OAuth или чужие приложения.
  if (request.method !== 'GET' || !url.href.startsWith(BASE)) return;
  if (request.mode === 'navigate') {
    const fallback = new URL('./index.html', BASE).href;
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(fallback, copy));
        }
        return response;
      }).catch(async () => (await caches.match(fallback)) || Response.error())
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached ||
      fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});
