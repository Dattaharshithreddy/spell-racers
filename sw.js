const V="sr7";
const FILES=["./","index.html","css/style.css","js/peerjs.min.js","js/data.js","js/store.js","js/content.js","js/audio.js","js/art.js","js/sprites.js","img/runners/sheet.json","img/runners/mithra.png","img/runners/chiku.png","img/runners/raja.png","img/runners/gaja.png","img/runners/neela.png","js/game.js","js/net.js","js/yaksha.js","js/ui.js","manifest.json","icon.svg","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:"reload"}))).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// network first for the app shell so updates arrive, cache as offline fallback
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(res=>{if(res.ok&&new URL(e.request.url).origin===location.origin){const c=res.clone();caches.open(V).then(cache=>cache.put(e.request,c))}return res}).catch(()=>caches.match(e.request)))});
