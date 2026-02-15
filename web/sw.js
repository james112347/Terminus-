// Terminus PWA - Service Worker
// Offline caching strategy: Cache First for assets, Network First for API calls

const CACHE_NAME = 'terminus-v2.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/config.js',
  './js/utils/storage.js',
  './js/utils/datetime.js',
  './js/utils/stats.js',
  './js/models/energy.js',
  './js/models/circadian.js',
  './js/models/sleep.js',
  './js/models/caffeine.js',
  './js/models/hydration.js',
  './js/models/patterns.js',
  './js/models/gsd-pipeline.js',
  './js/models/ralph-loop.js',
  './js/services/groq.js',
  './js/services/supabase.js',
  './js/services/sahha.js',
  './js/services/notifications.js',
  './js/components/dashboard.js',
  './js/components/timeline.js',
  './js/components/profile.js',
  './js/components/coaching.js',
  './js/components/reports.js',
  './js/components/settings.js',
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls
  if (url.hostname === 'api.groq.com' ||
      url.hostname.includes('supabase') ||
      url.hostname === 'api.sahha.ai') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for CDN (Supabase client library)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok && url.origin === location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
  );
});
