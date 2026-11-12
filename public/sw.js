// Service worker Leki: tylko powiadomienia push (bez cache i trybu offline).
// Treść przychodzi z Edge Function `notify`: { title, body, url, tag }.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Leki", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icon.svg",
      data: { url: data.url || "/" },
    }),
  );
});

// Otwiera „Dziś” albo „Zapasy”: w otwartym oknie aplikacji, a jeśli go nie ma, w nowym.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if (client.url !== url && "navigate" in client) await client.navigate(url);
          return;
        } catch {
          // Okno bez kontroli SW nie da się przekierować: otwieramy nowe.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
