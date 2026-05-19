// sw.js
const CACHE_NAME = 'masomo-notes-v1'; // Incremented version name for your new setup
const urlsToCache = [
  '/',                  // Essential: matches the domain root lookup
  './',                 // Matches relative root directory
  './index.html',       // Your landing page with the install button
  './dashboard.html',   // ✅ Added: Your actual note-taking workspace app
  './manifest.json',    // PWA configuration file
  './icon-192x192.png', // PWA mobile launch icons
  './icon-512x512.png'  // PWA mobile splash screens
];

/* ---------------------- 1. INSTALLATION ---------------------- */
// Caches all core application shell assets immediately upon visit
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Masomo Cache opened successfully!');
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting()) // Force new service worker to take control immediately
  );
});

/* ---------------------- 2. ACTIVATION ---------------------- */
// Clears out any old, broken cache memories whenever CACHE_NAME changes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache footprint:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Forces all open windows/tabs to use this service worker
  );
});

/* ---------------------- 3. FETCH INTERCEPTION ---------------------- */
// Intercepts network requests to serve assets instantly from local device storage
self.addEventListener('fetch', (event) => {
  // CRITICAL GUARD CLAUSE: Only handle standard local GET requests.
  // This explicitly bypasses any external or API POST requests (login, saveNote, etc.)
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Strategy: Serve from local cache instantly if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fallback: If not in cache, try to fetch it via internet connection
      return fetch(event.request).then((networkResponse) => {
        // Validation check: Only dynamically cache successful, standard static asset responses
        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
          return networkResponse;
        }

        // Cache any newly encountered static styles or assets on-the-fly for future offline use
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        console.log('[SW] Resource fetch failed completely offline:', err);
      });
    })
  );
});
