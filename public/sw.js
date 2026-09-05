// Minimalist Finance Tracker - Progressive Web App Service Worker
const CACHE_NAME = 'fintrack-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Install Event: Pre-cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up legacy caches and claim active clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Essential for Chromium PWA installability criteria
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API calls: Network-first strategy (fallback to offline response)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              error: 'Offline mode active. Your changes are saved locally and will sync when reconnected.',
              offline: true 
            }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        })
    );
    return;
  }

  // Navigation requests: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the updated HTML
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (images, fonts, scripts, css): Stale-while-revalidate / Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => {
          // Ignore background fetch error when offline
        });
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// Background sync support for offline transaction reconciliation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_CLOUD_SYNC' });
        });
      })
    );
  }
});

// Notification Click Event: Focuses or opens FinTrack to target section (dues or tabs)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetSection = (event.notification.data && event.notification.data.section) || 'dues';
  const urlToOpen = new URL(`/?section=${targetSection}`, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NAVIGATE_SECTION', section: targetSection });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push Event: Handles incoming Web Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'FinTrack Alert';
    const options = {
      body: data.body || 'You have an upcoming financial alert.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || { section: 'dues' },
      tag: data.tag || 'fintrack-alert',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Push notification parse error:', err);
  }
});
