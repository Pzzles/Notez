// Minimal offline-first service worker for the Tasks PWA.
const CACHE_PREFIX = "tasks-cache-"
const CACHE = `${CACHE_PREFIX}v5`
const PRECACHE = ["/", "/icon-512.png", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // One missing optional asset must not prevent the app shell from caching.
      Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      ),
    ),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      // Take control without forcing a second, competing page navigation.
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Next.js build assets are content-addressed, so cache-first is safe.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              event.waitUntil(
                caches.open(CACHE).then((cache) => cache.put(request, copy)),
              )
            }
            return response
          }),
      ),
    )
    return
  }

  // Do not interfere with framework development or other internal requests.
  if (url.pathname.startsWith("/_next/")) return

  // Prefer a fresh document, then fall back to the cached route or app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(request, copy)),
            )
          }
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    )
    return
  }

  // Cache same-origin static assets after a successful response.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(request, copy)),
            )
          }
          return response
        }),
    ),
  )
})
