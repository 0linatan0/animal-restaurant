const VERSION = '772e3a94b1c56262';
const CACHE = `little-kitchen-${VERSION}`;
const ASSETS = ["./assets/audio/bear/count-1.mp3","./assets/audio/bear/count-2.mp3","./assets/audio/bear/count-3.mp3","./assets/audio/bear/count-4.mp3","./assets/audio/bear/count-5.mp3","./assets/audio/bear/countHelp.mp3","./assets/audio/bear/empty.mp3","./assets/audio/bear/freeIntro.mp3","./assets/audio/bear/freeThanks.mp3","./assets/audio/bear/full.mp3","./assets/audio/bear/goodbye.mp3","./assets/audio/bear/less.mp3","./assets/audio/bear/more.mp3","./assets/audio/bear/order-broccoli-1.mp3","./assets/audio/bear/order-broccoli-2.mp3","./assets/audio/bear/order-broccoli-3.mp3","./assets/audio/bear/order-broccoli-4.mp3","./assets/audio/bear/order-broccoli-5.mp3","./assets/audio/bear/order-bun-1.mp3","./assets/audio/bear/order-bun-2.mp3","./assets/audio/bear/order-bun-3.mp3","./assets/audio/bear/order-bun-4.mp3","./assets/audio/bear/order-bun-5.mp3","./assets/audio/bear/order-dumpling-1.mp3","./assets/audio/bear/order-dumpling-2.mp3","./assets/audio/bear/order-dumpling-3.mp3","./assets/audio/bear/order-dumpling-4.mp3","./assets/audio/bear/order-dumpling-5.mp3","./assets/audio/bear/order-greens-1.mp3","./assets/audio/bear/order-greens-2.mp3","./assets/audio/bear/order-greens-3.mp3","./assets/audio/bear/order-greens-4.mp3","./assets/audio/bear/order-greens-5.mp3","./assets/audio/bear/order-mushroom-1.mp3","./assets/audio/bear/order-mushroom-2.mp3","./assets/audio/bear/order-mushroom-3.mp3","./assets/audio/bear/order-mushroom-4.mp3","./assets/audio/bear/order-mushroom-5.mp3","./assets/audio/bear/order-ribs-1.mp3","./assets/audio/bear/order-ribs-2.mp3","./assets/audio/bear/order-ribs-3.mp3","./assets/audio/bear/order-ribs-4.mp3","./assets/audio/bear/order-ribs-5.mp3","./assets/audio/bear/order-shrimp-1.mp3","./assets/audio/bear/order-shrimp-2.mp3","./assets/audio/bear/order-shrimp-3.mp3","./assets/audio/bear/order-shrimp-4.mp3","./assets/audio/bear/order-shrimp-5.mp3","./assets/audio/bear/resume.mp3","./assets/audio/bear/sortIntro.mp3","./assets/audio/bear/sortThanks.mp3","./assets/audio/bear/sortWrong.mp3","./assets/audio/bear/thanks.mp3","./assets/audio/bear/total-broccoli-1.mp3","./assets/audio/bear/total-broccoli-2.mp3","./assets/audio/bear/total-broccoli-3.mp3","./assets/audio/bear/total-broccoli-4.mp3","./assets/audio/bear/total-broccoli-5.mp3","./assets/audio/bear/total-bun-1.mp3","./assets/audio/bear/total-bun-2.mp3","./assets/audio/bear/total-bun-3.mp3","./assets/audio/bear/total-bun-4.mp3","./assets/audio/bear/total-bun-5.mp3","./assets/audio/bear/total-dumpling-1.mp3","./assets/audio/bear/total-dumpling-2.mp3","./assets/audio/bear/total-dumpling-3.mp3","./assets/audio/bear/total-dumpling-4.mp3","./assets/audio/bear/total-dumpling-5.mp3","./assets/audio/bear/total-greens-1.mp3","./assets/audio/bear/total-greens-2.mp3","./assets/audio/bear/total-greens-3.mp3","./assets/audio/bear/total-greens-4.mp3","./assets/audio/bear/total-greens-5.mp3","./assets/audio/bear/total-mixed-1.mp3","./assets/audio/bear/total-mixed-2.mp3","./assets/audio/bear/total-mixed-3.mp3","./assets/audio/bear/total-mixed-4.mp3","./assets/audio/bear/total-mixed-5.mp3","./assets/audio/bear/total-mushroom-1.mp3","./assets/audio/bear/total-mushroom-2.mp3","./assets/audio/bear/total-mushroom-3.mp3","./assets/audio/bear/total-mushroom-4.mp3","./assets/audio/bear/total-mushroom-5.mp3","./assets/audio/bear/total-ribs-1.mp3","./assets/audio/bear/total-ribs-2.mp3","./assets/audio/bear/total-ribs-3.mp3","./assets/audio/bear/total-ribs-4.mp3","./assets/audio/bear/total-ribs-5.mp3","./assets/audio/bear/total-shrimp-1.mp3","./assets/audio/bear/total-shrimp-2.mp3","./assets/audio/bear/total-shrimp-3.mp3","./assets/audio/bear/total-shrimp-4.mp3","./assets/audio/bear/total-shrimp-5.mp3","./assets/audio/bear/warning.mp3","./assets/audio/bear/welcome.mp3","./assets/audio/bear/wrong-broccoli.mp3","./assets/audio/bear/wrong-bun.mp3","./assets/audio/bear/wrong-dumpling.mp3","./assets/audio/bear/wrong-greens.mp3","./assets/audio/bear/wrong-mushroom.mp3","./assets/audio/bear/wrong-ribs.mp3","./assets/audio/bear/wrong-shrimp.mp3","./assets/audio/provenance.json","./assets/audio/rabbit/count-1.mp3","./assets/audio/rabbit/count-2.mp3","./assets/audio/rabbit/count-3.mp3","./assets/audio/rabbit/count-4.mp3","./assets/audio/rabbit/count-5.mp3","./assets/audio/rabbit/countHelp.mp3","./assets/audio/rabbit/empty.mp3","./assets/audio/rabbit/freeIntro.mp3","./assets/audio/rabbit/freeThanks.mp3","./assets/audio/rabbit/full.mp3","./assets/audio/rabbit/goodbye.mp3","./assets/audio/rabbit/less.mp3","./assets/audio/rabbit/more.mp3","./assets/audio/rabbit/order-broccoli-1.mp3","./assets/audio/rabbit/order-broccoli-2.mp3","./assets/audio/rabbit/order-broccoli-3.mp3","./assets/audio/rabbit/order-broccoli-4.mp3","./assets/audio/rabbit/order-broccoli-5.mp3","./assets/audio/rabbit/order-bun-1.mp3","./assets/audio/rabbit/order-bun-2.mp3","./assets/audio/rabbit/order-bun-3.mp3","./assets/audio/rabbit/order-bun-4.mp3","./assets/audio/rabbit/order-bun-5.mp3","./assets/audio/rabbit/order-dumpling-1.mp3","./assets/audio/rabbit/order-dumpling-2.mp3","./assets/audio/rabbit/order-dumpling-3.mp3","./assets/audio/rabbit/order-dumpling-4.mp3","./assets/audio/rabbit/order-dumpling-5.mp3","./assets/audio/rabbit/order-greens-1.mp3","./assets/audio/rabbit/order-greens-2.mp3","./assets/audio/rabbit/order-greens-3.mp3","./assets/audio/rabbit/order-greens-4.mp3","./assets/audio/rabbit/order-greens-5.mp3","./assets/audio/rabbit/order-mushroom-1.mp3","./assets/audio/rabbit/order-mushroom-2.mp3","./assets/audio/rabbit/order-mushroom-3.mp3","./assets/audio/rabbit/order-mushroom-4.mp3","./assets/audio/rabbit/order-mushroom-5.mp3","./assets/audio/rabbit/order-ribs-1.mp3","./assets/audio/rabbit/order-ribs-2.mp3","./assets/audio/rabbit/order-ribs-3.mp3","./assets/audio/rabbit/order-ribs-4.mp3","./assets/audio/rabbit/order-ribs-5.mp3","./assets/audio/rabbit/order-shrimp-1.mp3","./assets/audio/rabbit/order-shrimp-2.mp3","./assets/audio/rabbit/order-shrimp-3.mp3","./assets/audio/rabbit/order-shrimp-4.mp3","./assets/audio/rabbit/order-shrimp-5.mp3","./assets/audio/rabbit/resume.mp3","./assets/audio/rabbit/sortIntro.mp3","./assets/audio/rabbit/sortThanks.mp3","./assets/audio/rabbit/sortWrong.mp3","./assets/audio/rabbit/thanks.mp3","./assets/audio/rabbit/total-broccoli-1.mp3","./assets/audio/rabbit/total-broccoli-2.mp3","./assets/audio/rabbit/total-broccoli-3.mp3","./assets/audio/rabbit/total-broccoli-4.mp3","./assets/audio/rabbit/total-broccoli-5.mp3","./assets/audio/rabbit/total-bun-1.mp3","./assets/audio/rabbit/total-bun-2.mp3","./assets/audio/rabbit/total-bun-3.mp3","./assets/audio/rabbit/total-bun-4.mp3","./assets/audio/rabbit/total-bun-5.mp3","./assets/audio/rabbit/total-dumpling-1.mp3","./assets/audio/rabbit/total-dumpling-2.mp3","./assets/audio/rabbit/total-dumpling-3.mp3","./assets/audio/rabbit/total-dumpling-4.mp3","./assets/audio/rabbit/total-dumpling-5.mp3","./assets/audio/rabbit/total-greens-1.mp3","./assets/audio/rabbit/total-greens-2.mp3","./assets/audio/rabbit/total-greens-3.mp3","./assets/audio/rabbit/total-greens-4.mp3","./assets/audio/rabbit/total-greens-5.mp3","./assets/audio/rabbit/total-mixed-1.mp3","./assets/audio/rabbit/total-mixed-2.mp3","./assets/audio/rabbit/total-mixed-3.mp3","./assets/audio/rabbit/total-mixed-4.mp3","./assets/audio/rabbit/total-mixed-5.mp3","./assets/audio/rabbit/total-mushroom-1.mp3","./assets/audio/rabbit/total-mushroom-2.mp3","./assets/audio/rabbit/total-mushroom-3.mp3","./assets/audio/rabbit/total-mushroom-4.mp3","./assets/audio/rabbit/total-mushroom-5.mp3","./assets/audio/rabbit/total-ribs-1.mp3","./assets/audio/rabbit/total-ribs-2.mp3","./assets/audio/rabbit/total-ribs-3.mp3","./assets/audio/rabbit/total-ribs-4.mp3","./assets/audio/rabbit/total-ribs-5.mp3","./assets/audio/rabbit/total-shrimp-1.mp3","./assets/audio/rabbit/total-shrimp-2.mp3","./assets/audio/rabbit/total-shrimp-3.mp3","./assets/audio/rabbit/total-shrimp-4.mp3","./assets/audio/rabbit/total-shrimp-5.mp3","./assets/audio/rabbit/warning.mp3","./assets/audio/rabbit/welcome.mp3","./assets/audio/rabbit/wrong-broccoli.mp3","./assets/audio/rabbit/wrong-bun.mp3","./assets/audio/rabbit/wrong-dumpling.mp3","./assets/audio/rabbit/wrong-greens.mp3","./assets/audio/rabbit/wrong-mushroom.mp3","./assets/audio/rabbit/wrong-ribs.mp3","./assets/audio/rabbit/wrong-shrimp.mp3","./assets/icon-192.png","./assets/icon-512.png","./assets/icon.svg","./index.html","./js/app.js","./js/art.js","./js/audio.js","./js/catalog.js","./js/model.js","./js/offline.js","./js/parents.js","./js/storage.js","./manifest.webmanifest","./styles.css","./asset-manifest.json"];
const absolute = path => new URL(path, self.registration.scope).href;
// Pages 会把 index.html 跳转到目录首页；导航不能使用带跳转标记的缓存响应。
function navigationResponse(response) {
  return response.redirected ? new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers }) : response;
}
async function hasBrokenNavigationCache() {
  for (const name of await caches.keys()) {
    if (!name.startsWith('little-kitchen-') || name === CACHE || name.endsWith('-preparing')) continue;
    if ((await (await caches.open(name)).match(absolute('./index.html')))?.redirected) return true;
  }
  return false;
}
async function prepare() {
  const manifestResponse = await fetch(absolute('./asset-manifest.json'), { cache: 'reload' });
  if (!manifestResponse.ok || (await manifestResponse.json()).version !== VERSION) throw new Error('资源版本已变化，请先安装新版本。');
  const staging = `${CACHE}-preparing`;
  const cache = await caches.open(staging);
  try {
    // 全部资源成功后才激活，失败则删掉不完整的新版本缓存。
    for (let i = 0; i < ASSETS.length; i += 8) await Promise.all(ASSETS.slice(i, i + 8).map(async path => {
      const url = absolute(path), response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`资源下载失败 ${path}`);
      await cache.put(url, path === './index.html' ? navigationResponse(response) : response);
    }));
    const destination = await caches.open(CACHE);
    for (const request of await cache.keys()) await destination.put(request, await cache.match(request));
  } finally { await caches.delete(staging); }
}
async function complete() { const cache = await caches.open(CACHE); const results = await Promise.all(ASSETS.map(path => cache.match(absolute(path)))); return results.every(Boolean); }
self.addEventListener('install', event => event.waitUntil((async () => {
  await prepare();
  // 旧版本首页已打不开时主动接管，避免必须清空录音或进入家长页才能修复。
  // 正常版本仍沿用家长主动更新，不在游戏中刷新页面。
  if (await hasBrokenNavigationCache()) await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(n => n.startsWith('little-kitchen-') && n !== CACHE).map(n => caches.delete(n)));
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_CACHE') event.waitUntil(complete().then(ready => event.ports[0]?.postMessage({ ready, version: VERSION })));
  if (event.data?.type === 'REPAIR_CACHE') event.waitUntil(prepare().then(() => event.ports[0]?.postMessage({ ready: true })).catch(() => event.ports[0]?.postMessage({ ready: false })));
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      const page = await cache.match(absolute('./index.html'));
      return page ? navigationResponse(page) : fetch(event.request);
    }
    const response = await cache.match(event.request, { ignoreSearch: false });
    // Safari 离线播放会请求音频分段，使用已缓存完整文件响应 Range。
    if (response && event.request.headers.has('range')) {
      const data = await response.arrayBuffer(), range = /^bytes=(\d+)-(\d*)$/.exec(event.request.headers.get('range'));
      if (range) {
        const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : data.byteLength - 1, data.byteLength - 1);
        if (start >= data.byteLength || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
        return new Response(data.slice(start, end + 1), { status: 206, headers: { 'Content-Type': response.headers.get('content-type'), 'Content-Range': `bytes ${start}-${end}/${data.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
      }
    }
    return response || fetch(event.request);
  })());
});
