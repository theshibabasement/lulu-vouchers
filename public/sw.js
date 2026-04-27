/* Service Worker minimal pra habilitar instalação como PWA.
 * Estratégia: network-first sem cache offline (mantém conteúdo fresco).
 * Existência do SW + manifest é o que torna o app "installable" no Chrome/Android.
 */

const VERSION = 'lulu-vales-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', () => {
  // Network-first: nada a fazer, browser usa rede normal.
});
