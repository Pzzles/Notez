// Minimal offline-first service worker for the Tasks PWA.
const CACHE_PREFIX = "tasks-cache-"
const CACHE = `${CACHE_PREFIX}v6`
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
      .then(() => self.clients.claim()),
  )
})

async function cacheSuccessfulResponse(request, response) {
  if (!response.ok) return

  try {
    const cache = await caches.open(CACHE)
    await cache.put(request, response.clone())
  } catch (error) {
    // Storage quotas and private modes can reject cache writes. The network
    // response must still reach the page.
    console.warn("[Service worker] cache write failed:", error)
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  await cacheSuccessfulResponse(request, response)
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    await cacheSuccessfulResponse(request, response)
    return response
  } catch (error) {
    const cached = (await caches.match(request)) || (await caches.match("/"))
    if (cached) return cached
    throw error
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Do not interfere with framework development or other internal requests.
  if (url.pathname.startsWith("/_next/")) return

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})
