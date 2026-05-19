const CACHE_NAME = 'masomo-typewriter-v2'; // Incremented version
const urlsToCache = [
  '/',                  // Essential: matches the domain root lookup
  './',                 // Matches relative root directory
  './index.html',       // Matches explicit document asset
  './manifest.json',    // PWA Configuration
  './icon-192x192.png', // PWA Launch icons
  './icon-512x512.png'
];

// 1. INSTALLATION: Cache all key assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Masomo Cache Opened successfully!');
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting()) // Force activation right away
  );
});

// 2. ACTIVATION: Clean up old caches if versions update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache footprint:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH INTERCEPTION: The vital part making it load offline!
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests (ignores internal extension schemes)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Strategy: Serve from local cache immediately if found, otherwise hit network
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Don't cache API POST requests (like your login/save operations to Cloudflare)
        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
          return networkResponse;
        }

        // Dynamically cache any new layout styles or static image links if fetched online
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // Network failed (we are offline) and it wasn't in cache
        console.log('Resource fetch failed completely offline:', err);
      });
    })
  );
});
