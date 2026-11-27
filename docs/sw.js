// Diálisis Contigo · Copyright (C) 2026 Enrique Ortiz · SPDX-License-Identifier: GPL-3.0-or-later
// Service worker de Diálisis Contigo: guarda la app en el teléfono para que abra sin internet.
// Debe ser igual a APP_VERSION en index.html (la prueba lo comprueba). Al cambiarla, los teléfonos descargan la app nueva.
const VERSION = '0.0.7.1';
const APP_CACHE = 'app-' + VERSION;
const FONT_CACHE = 'fuentes';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('app-') && k !== APP_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Al tocar el aviso de "Tiempo terminado", vuelve a la app.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => (list.length ? list[0].focus() : self.clients.openWindow('./')))
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fuentes de Google: se guardan la primera vez que hay internet.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pantalla principal: intenta traer la versión nueva; sin internet usa la guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demás archivos de la app: primero lo guardado.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
