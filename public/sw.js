// Minimal offline-first service worker for the Tasks PWA.
const CACHE = "tasks-cache-v2"
const PRECACHE = ["/", "/icon-512.png", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      // Force-reload all open tabs after a cache-busting SW update so stale
      // module chunks (e.g. old deps) are never executed against a new server.
      .then((clients) => Promise.all(clients.map((c) => c.navigate(c.url)))),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Never cache /_next/ JS/CSS chunks — the dev server and HTTP Cache handle
  // freshness; intercepting them causes stale-module errors after deploys.
  if (url.pathname.startsWith("/_next/")) return

  // Network-first for page navigations so content stays fresh, with an
  // offline fallback to the cached app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    )
    return
  }

  // Cache-first for same-origin static assets (icons, manifest, etc).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
})
