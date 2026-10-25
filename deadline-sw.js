// Service worker for Deadline Tracker: lets the app open with no connection.
// Scope is limited to /deadline-tracker*, so it never touches the rest of the portfolio site.
const CACHE = 'deadline-tracker-v3';
const SHELL = [
  'deadline-tracker.html',
  'deadline-tracker.webmanifest',
  'assets/deadline-icon-192.png',
  'assets/deadline-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('deadline-tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for the page (so updates show up), cache as the offline fallback.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const ownFile = url.origin === self.location.origin && SHELL.some((f) => url.pathname.endsWith('/' + f));
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!ownFile && !font) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

// Tapping a reminder opens (or focuses) the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.includes('deadline-tracker'));
      return open ? open.focus() : self.clients.openWindow('deadline-tracker.html');
    })
  );
});
