/**
 * service-worker.js — Odyssée de la Sagesse
 * Stratégie : Cache-First pour assets, Network-First pour navigation
 * Compatible PWA + TWA Android offline
 */

const CACHE_NAME      = 'odys-v1';
const OFFLINE_PAGE    = './index.html';

// Assets pré-cachés au moment de l'installation
const PRE_CACHE_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-512x512.png',
  './screenshots/screenshot-portrait.png',
  './screenshots/screenshot-landscape.png',
];

// Domaines externes à mettre en cache dynamiquement
const EXTERNAL_CACHE_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /transparenttextures\.com/,
];

// ── Installation : pré-cache ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing odys-v1');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pré-cache local (ignore les échecs individuels)
      const results = await Promise.allSettled(
        PRE_CACHE_URLS.map(url => cache.add(url).catch(e => {
          console.warn(`[SW] Pre-cache failed for ${url}:`, e.message);
        }))
      );
      console.log('[SW] Pre-cache done:', results.filter(r => r.status === 'fulfilled').length, '/', PRE_CACHE_URLS.length);
    })
  );
  self.skipWaiting();
});

// ── Activation : nettoyage des anciens caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie hybride ──────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer chrome-extension et autres schémas non-http
  if (!request.url.startsWith('http')) return;

  // Navigation (HTML) → Network-First avec fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Assets locaux → Cache-First
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Ressources externes connues (fonts, textures) → Stale-While-Revalidate
  if (EXTERNAL_CACHE_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Tout le reste → Network avec fallback cache
  event.respondWith(networkWithCacheFallback(request));
});

// ── Stratégies ────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(OFFLINE_PAGE) || new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request) || await caches.match(OFFLINE_PAGE);
    return cached || offlineFallbackPage();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || await networkPromise || offlineFallbackPage();
}

async function networkWithCacheFallback(request) {
  try {
    return await fetch(request);
  } catch {
    return caches.match(request) || new Response('', { status: 503 });
  }
}

function offlineFallbackPage() {
  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>odys — hors ligne</title>
    <style>
      body{background:#f9f7f2;color:#1a1a1a;font-family:serif;
        display:flex;align-items:center;justify-content:center;
        height:100vh;margin:0;flex-direction:column;gap:1rem}
      h1{color:#af944d;font-size:2rem}p{opacity:.6;font-size:.9rem}
    </style></head>
    <body><h1>Odyssée de la Sagesse</h1>
    <p>Connexion indisponible — rechargez quand vous serez en ligne.</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ── Message : forcer la mise à jour du cache ──────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0]?.postMessage({ done: true });
    });
  }
});
