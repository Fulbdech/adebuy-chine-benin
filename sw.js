// Bump this version string every time you deploy changes — it forces
// the service worker to fetch fresh files instead of serving old cached ones.
const CACHE_VERSION = 'adebuy-v1';
const CACHE_NAME = 'adebuy-cache-' + CACHE_VERSION;

const PRECACHE_URLS = [
  'index.html',
  'tarifs.html',
  'suivi.html',
  'politique.html',
  'contact.html',
  'offline.html',
  'style.css',
  'script.js',
  'manifest.json',
  'logo.png',
  'icon-192.png',
  'icon-512.png'
];

// ---------- Install: pre-cache the core pages/assets ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---------- Activate: clear out old cache versions ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('adebuy-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---------- Fetch strategy ----------
// Network-first for HTML (so content updates show up as soon as you're online),
// falling back to cache, then to an offline page if nothing is cached.
// Cache-first for everything else (CSS/JS/images), which rarely changes.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.headers.get('accept') && req.headers.get('accept').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('offline.html'))
        )
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => cached);
      })
    );
  }
});

// ---------- Push notifications (Firebase Cloud Messaging) ----------
// This listens for push events once FCM is wired up (see firebase-init.js).
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.notification?.title || 'Adebuy';
  const options = {
    body: data.notification?.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || 'index.html';
  event.waitUntil(clients.openWindow(url));
});
