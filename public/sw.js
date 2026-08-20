// Minimal offline-first service worker for the Tasks PWA.
const CACHE_PREFIX = "tasks-cache-"
const CACHE = `${CACHE_PREFIX}v8`
const PRECACHE = ["/", "/history", "/icon-512.png", "/manifest.webmanifest"]

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

  // Next uses these requests to stream route data during soft navigation.
  // Caching them as ordinary files can make the router receive an old RSC
  // payload and leave the visible page unchanged.
  const isFrameworkDataRequest =
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Router-Prefetch") ||
    request.headers.get("Accept")?.includes("text/x-component")

  if (isFrameworkDataRequest) return

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

  const isPublicAsset =
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon-512.png" ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg")

  if (isPublicAsset) event.respondWith(cacheFirst(request))
})
