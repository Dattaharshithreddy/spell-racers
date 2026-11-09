// Offline cache for MAATHU. Bump V when assets change.
const V = "maathu-v3";
const CORE = ["./", "index.html", "css/maathu.css", "manifest.json", "vendor/three.module.min.js", "vendor/peerjs.min.js",
  "vendor/addons/loaders/GLTFLoader.js", "vendor/addons/utils/SkeletonUtils.js", "vendor/addons/utils/BufferGeometryUtils.js",
  "js/main.js", "js/world.js", "js/towns.js", "js/combat.js", "js/vehicles.js", "js/chars.js", "js/content.js", "js/ui.js", "js/input.js", "js/speech.js", "js/audio.js", "js/save.js", "js/net.js",
  "assets/bangara.glb", "assets/gundamma.glb", "assets/props.glb", "assets/goon.glb", "assets/weapons.glb", "assets/vehicles.glb", "assets/art/duo.webp",
  "world/world.json", "world/height.bin", "world/district.bin", "world/color.png", "world/veg.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return res; })));
});
