/* DOPA FMS service worker.
 *
 * Strategy:
 *  - /api/**            → never intercepted (always network; auth + live data)
 *  - page navigations   → network-first, falling back to /offline.html
 *  - /_next/static, /icons, images → stale-while-revalidate (immutable/static)
 *
 * Bump CACHE_VERSION to invalidate all caches on deploy of breaking changes.
 */
const CACHE_VERSION = 'dopa-fms-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGE_CACHE = `${CACHE_VERSION}-pages`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL, '/manifest.json', '/icons/icon-192.png'])
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never cache API calls — auth tokens and live data must always hit the network.
  if (url.pathname.startsWith('/api/')) return

  // Page navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))
        )
    )
    return
  }

  // Static assets: stale-while-revalidate.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return response
          })
          .catch(() => cached)
        return cached ?? network
      })
    )
  }
})
