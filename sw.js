// MedBoard Prep v3 — offline service worker (deploy build, app served as index.html).
// Strategy: network-first for same-origin files (so app updates arrive when
// online, cached copy serves when offline); cache-first for CDN libraries
// (Chart.js / JSZip / pdf.js are versioned URLs, safe to cache forever).
const CACHE = 'medboard-v3.0.0';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;

  if (sameOrigin) {
    // Network-first: fresh app when online, cached app when offline.
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() =>
        caches.match(e.request).then(m => m || caches.match('./index.html'))
      )
    );
  } else {
    // Cache-first for CDN libs.
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      }))
    );
  }
});
