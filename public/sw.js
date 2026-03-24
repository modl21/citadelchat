const CACHE_NAME = 'citadel-chat-cache-v7';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/citadel-logo.jpg',
  '/citadeli.jpg',
  '/icon-maskable-512.png',
  '/odell-badge.jpg',
  '/knowledge-packs/emergency-medical.json',
  '/knowledge-packs/water-food.json',
  '/knowledge-packs/comms-navigation.json',
  '/knowledge-packs/field-engineering.json',
  '/knowledge-packs/long-term-agriculture.json',
  '/knowledge-packs/off-grid-medicine.json',
  '/knowledge-packs/cbrn-survival.json',
  '/knowledge-packs/trade-barter.json',
  '/knowledge-packs/firearms-weapons.json',
  '/knowledge-packs/perimeter-defense.json',
  '/knowledge-packs/mechanical-repair.json',
  '/knowledge-packs/fuel-heat-cooking.json',
  '/knowledge-packs/water-systems.json',
  '/knowledge-packs/community-governance.json',
  '/knowledge-packs/offline-information-systems.json',
  '/knowledge-packs/education-skill-transfer.json',
];

async function warmOfflineAssets() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(OFFLINE_ASSETS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    warmOfflineAssets().then(() => self.skipWaiting())
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

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  if (event.data.type === 'CACHE_KNOWLEDGE_PACKS') {
    event.waitUntil(
      warmOfflineAssets()
        .then(() => {
          if (event.source && 'postMessage' in event.source) {
            event.source.postMessage({ type: 'CACHE_READY' });
          }
        })
        .catch(() => {
          if (event.source && 'postMessage' in event.source) {
            event.source.postMessage({ type: 'CACHE_ERROR' });
          }
        })
    );
  }
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
