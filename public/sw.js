// ZoTracker Service Worker

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Listen for scheduled notification messages from the app
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
