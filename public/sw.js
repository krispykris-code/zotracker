// ZoTracker Service Worker

const CACHE_NAME = "zotracker-v1";

// Core pages and assets to cache
const PRECACHE_URLS = ["/", "/stats", "/calendar"];

// Install: precache core pages
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET requests and Firebase/external requests
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Static assets (_next/, icons, fonts): cache-first
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Pages: network-first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Listen for scheduled notification messages from the app
// KNOWN LIMITATION: setTimeout only survives while this service worker stays
// alive. Browsers (especially iOS Safari) terminate idle service workers within
// ~30s, so a reminder scheduled hours ahead will usually NOT fire — it is only
// reliable while the app stays in the foreground. A truly reliable reminder
// needs the Push API + a server. Keeping the current behavior is a deliberate
// decision (2026-07); do not try to patch this with keep-alive hacks.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SCHEDULE_REMINDER") {
    const { delayMs, title, body } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "sleep-reminder",
        renotify: true,
      });
    }, delayMs);
  }
});

// Handle notification click → open the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    })
  );
});
