// Minimal service worker — this app is entirely data-driven (Supabase), so there's little
// value in real offline functionality. This exists mainly to satisfy "Add to Home Screen"
// install criteria on browsers that require an active fetch handler. Network-first: always
// prefer fresh data, cache is only a fallback for the shell when fully offline.
const CACHE_NAME = "kotoba-shell-v1";
const SHELL_URLS = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
