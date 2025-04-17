const CACHE_NAME = "edyhost-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/admin.html",
  "/style.css",
  "/script.js",
  "/dashboard.js",
  "/admin.js",
  "/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
