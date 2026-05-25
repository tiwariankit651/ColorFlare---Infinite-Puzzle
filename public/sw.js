const CACHE_NAME = 'colorflow-v1.6.0';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'screenshots/home_screen.png',
  'screenshots/gameplay_action.png',
  'screenshots/level_selection.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll as a starting point but don't let it block activation if a single asset fails
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache addAll failed:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network First strategy for HTML, Cache First for others
self.addEventListener('fetch', (event) => {
  const isHtml = event.request.mode === 'navigate';
  
  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
