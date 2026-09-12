const VERSION = 'yeyou-v3';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const BASE_URL = new URL('./', self.location.href);
const BASE_PATH = BASE_URL.pathname;
const atBase = path => new URL(path, BASE_URL).pathname;
const CORE = [BASE_PATH, atBase('manifest.webmanifest'), atBase('app-icon.svg')];

self.addEventListener('install', event => event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(CORE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(BASE_PATH)));
    return;
  }
  const cacheFirst = url.pathname.startsWith(atBase('kuromoji/')) || url.pathname === atBase('kanji_to_hiragana.json');
  event.respondWith(cacheFirst ? cachedThenNetwork(event.request) : networkThenCached(event.request));
});

async function cachedThenNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone());
  return response;
}

async function networkThenCached(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(RUNTIME)).put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}
