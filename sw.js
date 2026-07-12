/* Warfarin Calendar — Service Worker
   Enables offline use of the app shell. Bump CACHE when assets change. */
"use strict";

const CACHE = "warfarin-v1";
// Same-origin app shell — precached on install so the app opens offline.
const APP_SHELL = ["./", "index.html", "manifest.json", "icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navigations: serve cached app shell first, fall back to network, then to index.html.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).catch(() => caches.match("index.html"))
      )
    );
    return;
  }

  // Everything else (fonts, CDN scripts, icon): cache-first, then runtime-cache the response.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
