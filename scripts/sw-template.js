const VERSION = '__VERSION__';
const CACHE = `little-kitchen-${VERSION}`;
const ASSETS = __ASSETS__;
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
