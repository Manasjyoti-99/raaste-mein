/* Cache only this prototype's bundled files. External map tiles remain online. */
"use strict";
const VERSION = "5.1.0";
const CACHE_PREFIX = "invehicle-shell:" + new URL(self.registration.scope).pathname + ":";
const CACHE_NAME = CACHE_PREFIX + VERSION;
const SHELL = [
  "./", "index.html", "style.css?v=5.1.0", "app.js?v=5.1.0", "suggestion-engine.js?v=5.1.0",
  "feedback-learning.js?v=5.1.0", "routine-engine.js?v=5.1.0", "gps-engine.js?v=5.1.0", "order-engine.js?v=5.1.0",
  "history-backup.js?v=5.1.0", "pwa.js?v=5.1.0", "manifest.json",
  "data/route.json", "data/cafes.json", "data/demo-settings.json", "data/history.json",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css",
  "vendor/leaflet/images/layers.png", "vendor/leaflet/images/layers-2x.png",
  "vendor/leaflet/images/marker-icon.png", "vendor/leaflet/images/marker-icon-2x.png",
  "vendor/leaflet/images/marker-shadow.png", "icons/app-192.png", "icons/app-512.png", "icons/app-maskable-512.png"
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll is atomic: the UI only calls the app offline-ready after a complete install.
    await cache.addAll(SHELL);
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
  if (event.data?.type === "GET_BUILD") event.ports?.[0]?.postMessage({ version: VERSION });
});

async function appNavigation(request, base) {
  let cached = null;
  try {
    const cache = await caches.open(CACHE_NAME);
    cached = await cache.match(base.href) || await cache.match(new URL("index.html", base).href);
  } catch (error) {
    // A refused/unavailable Cache API must not break an otherwise online page.
  }
  if (!cached) return fetch(request);
  // A host can redirect index.html to ./. Cache.addAll retains that redirect
  // history. Chrome rejects it when returned to a manual-mode navigation.
  // Copy the cached HTML body/headers, producing a response without redirects.
  return cached.redirected
    ? new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers })
    : cached;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url), base = new URL(self.registration.scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  if (request.mode === "navigate") {
    // Serve a single version's cached HTML and JS together until the user chooses an update.
    if (![base.pathname, base.pathname + "index.html"].includes(url.pathname)) return;
    event.respondWith(appNavigation(request, base));
    return;
  }
  if (!SHELL.includes(url.href)) return;
  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
    } catch (error) {
      // The online app also needs its scripts when cache access is refused.
    }
    return fetch(request);
  })());
});
