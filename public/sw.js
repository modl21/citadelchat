const CACHE_NAME = 'citadel-chat-cache-v3';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/citadel-logo.jpg',
  '/odell-badge.jpg',
  '/knowledge-packs/emergency-medical.json',
  '/knowledge-packs/water-food.json',
  '/knowledge-packs/comms-navigation.json',
  '/knowledge-packs/field-engineering.json',
  '/knowledge-packs/long-term-agriculture.json',
  '/knowledge-packs/off-grid-medicine.json',
  '/knowledge-packs/cbrn-survival.json',
  '/knowledge-packs/trade-barter.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }

          const fallback = await caches.match('/index.html');
          if (fallback) {
            return fallback;
          }

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => new Response('Offline resource unavailable', { status: 503, statusText: 'Offline' }));
    })
  );
});
