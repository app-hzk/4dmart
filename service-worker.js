/* ============================================================
   4D MART — Service Worker v0.1.0
   ============================================================ */

const CACHE_NAME = '4dmart-v0.1.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/admin.js',
  './data/products.json',
  './assets/icon.svg',
];

/* Install */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

/* Activate */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch: cache-first untuk asset, network-first untuk API */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-same-origin & Google Sheets (fresh data)
  if (url.origin !== location.origin && !url.hostname.includes('cdnjs.cloudflare.com') && !url.hostname.includes('fonts.googleapis.com') && !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Cache same-origin & static CDN
          if (response.status === 200 && (url.origin === location.origin || url.hostname.includes('cdnjs') || url.hostname.includes('fonts'))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});