const CACHE_NAME = 'colorflow-v1.7.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-mobile.jpg',
  '/screenshot-desktop.jpg'
];

const shouldCache = (url) => {
  if (!url.startsWith('http')) return false;

  const urlObj = new URL(url);
  
  // Do NOT cache API endpoints or Firebase traffic
  if (urlObj.pathname.startsWith('/api/')) return false;
  if (
    urlObj.hostname.includes('firebase') || 
    urlObj.hostname.includes('googleapis') || 
    urlObj.hostname.includes('firestore') ||
    urlObj.hostname.includes('identitytoolkit')
  ) {
    return false;
  }
  
  // Cache our own origin's assets or Google Fonts
  const isSameOrigin = urlObj.origin === self.location.origin;
  const isGoogleFont = urlObj.hostname.includes('fonts.googleapis.com') || urlObj.hostname.includes('fonts.gstatic.com');
  
  return isSameOrigin || isGoogleFont;
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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

// Network First strategy for HTML, Cache First (with stale-while-revalidate fallback) for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  if (url.includes('.well-known')) {
    return; // Bypass service worker for Digital Asset Links
  }

  const isHtml = event.request.mode === 'navigate';
  
  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && shouldCache(url)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/') || caches.match('/index.html');
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate pattern
          if (shouldCache(url)) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse);
                  });
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          if (shouldCache(url)) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
        });
      })
    );
  }
});
