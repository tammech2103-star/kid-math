// Service Worker for Kid Math Retro
var CACHE_NAME = 'kid-math-retro-v3';
var APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/app.js',
  '/js/data/tuning.js',
  '/js/core/audio.js',
  '/js/domain/curriculum.js',
  '/js/domain/questions.js',
  '/js/data/game-map.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL).catch(function (err) {
        console.warn('SW: some files failed to cache:', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_NAME;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  // Network first for API/CDN, cache first for app shell
  var url = e.request.url;
  if (url.indexOf('cdn.emulatorjs.org') !== -1) {
    // Cache EmulatorJS cores on first load
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        return fetch(e.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function () {
          return cached || new Response('Offline', { status: 503 });
        });
      })
    );
  } else {
    // Cache first for app shell
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});
