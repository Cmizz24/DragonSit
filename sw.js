// Service worker: caches the app shell so DragonSit works offline once visited.
const CACHE = 'dragonsit-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './src/main.js', './src/game.js', './src/state.js', './src/actions.js', './src/economy.js', './src/breeding.js', './src/battle.js', './src/island.js', './src/audio.js', './src/util.js',
  './src/social.js', './src/cloud.js', './src/config.js',
  './src/data/elements.js', './src/data/dragons.js', './src/data/buildings.js', './src/data/quests.js', './src/data/campaign.js', './src/data/events.js', './src/data/achievements.js', './src/data/missions.js',
  './src/art/dragon.js', './src/art/buildings.js', './src/art/cache.js', './src/art/sprites.js',
  './src/art/three/engine.js', './src/art/three/dragonModel.js', './src/art/three/buildingModel.js', './src/art/three/viewer.js', './src/art/three/arena.js', './vendor/three.module.min.js',
  './src/ui/ui.js', './src/ui/hud.js', './src/ui/shop.js', './src/ui/dragons.js', './src/ui/building.js', './src/ui/breed.js', './src/ui/battle.js', './src/ui/quests.js', './src/ui/settings.js', './src/ui/friends.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (so updates arrive), falling back to cache when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
