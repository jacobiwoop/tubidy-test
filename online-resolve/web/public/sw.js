// Service worker de Spotywoop : ouvre le site sans réseau et garde de quoi naviguer hors ligne.
// - pages : réseau d'abord (3 s au plus), sinon la page en cache ;
// - fichiers du site (/assets, nommés par leur contenu) et polices : cache d'abord ;
// - API du catalogue et paroles : réseau d'abord, la dernière réponse en secours ;
// - pochettes : cache d'abord, 400 au plus.
// Le son n'est jamais mis en cache ici : les titres téléchargés sont dans IndexedDB (src/downloads.js), et
// /api/resolve (liens qui expirent) passe toujours par le réseau.

const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const API = `api-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const KEEP = [SHELL, ASSETS, API, IMAGES];
const MAX_IMAGES = 400;
const MAX_API = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/logo.png', '/favicon.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), ms));
}

async function networkFirst(request, cacheName, { wait = 0, fallback, max } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const net = fetch(request);
    const res = await (wait ? Promise.race([net, timeout(wait)]) : net);
    if (res.ok) {
      cache.put(request, res.clone());
      if (max) trim(cacheName, max);
    }
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) || (fallback && (await caches.match(fallback)));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') {
    cache.put(request, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, { wait: 3000, fallback: '/' }));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, ASSETS));
    } else if (url.pathname.startsWith('/api/')) {
      const route = url.searchParams.get('route') || url.pathname.slice(5);
      // Liens de lecture et paroles en flux : toujours en direct.
      if (route.startsWith('resolve') || url.searchParams.get('stream') === '1') return;
      event.respondWith(networkFirst(request, API, { max: MAX_API }));
    } else if (/\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
      event.respondWith(cacheFirst(request, SHELL));
    }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES).catch(() => Response.error()));
  }
});
