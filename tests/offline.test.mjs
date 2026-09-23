import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../public/asset-manifest.json', import.meta.url)));
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function environment({ fail = false, version = manifest.version } = {}) {
  const stores = new Map(), events = new Map();
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name), key = r => typeof r === 'string' ? r : r.url;
      return { put: async (r, response) => store.set(key(r), response.clone()), match: async r => store.get(key(r))?.clone(), keys: async () => [...store.keys()] };
    },
    keys: async () => [...stores.keys()], delete: async name => stores.delete(name),
  };
  const self = { registration: { scope: 'https://kitchen.example/app/' }, location: { origin: 'https://kitchen.example' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => events.set(name, fn), skipWaiting() {} };
  const fetch = async url => {
    if (url.endsWith('asset-manifest.json')) return Response.json({ ...manifest, version });
    if (fail && url.endsWith('styles.css')) return new Response('', { status: 503 });
    return new Response(url.endsWith('.mp3') ? new Uint8Array(200) : 'resource', { headers: { 'Content-Type': url.endsWith('.mp3') ? 'audio/mpeg' : 'text/plain' } });
  };
  vm.runInNewContext(source, { self, caches, fetch, URL, Response });
  const run = (name, data = {}) => { let result; events.get(name)({ ...data, waitUntil: p => { result = p; }, respondWith: p => { result = p; } }); return result; };
  return { run, caches, stores };
}
test('完整缓存才报告离线就绪，音频支持Range', async () => {
  const e = environment(); await e.run('install');
  let answer;
  await e.run('message', { data: { type: 'CHECK_CACHE' }, ports: [{ postMessage: a => answer = a }] });
  assert.equal(answer.ready, true);
  const response = await e.run('fetch', { request: new Request('https://kitchen.example/app/assets/audio/rabbit/welcome.mp3', { headers: { Range: 'bytes=10-19' } }) });
  assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 10);
});
test('下载失败不报告就绪，清理暂存资源', async () => {
  const e = environment({ fail: true }); await assert.rejects(e.run('install'));
  assert.ok(![...e.stores.keys()].some(k => k.endsWith('-preparing')));
  let answer; await e.run('message', { data: { type: 'CHECK_CACHE' }, ports: [{ postMessage: a => answer = a }] });
  assert.equal(answer.ready, false);
});
test('修复失败保留现有缓存，不混用新版本资源', async () => {
  for (const options of [{ fail: true }, { version: 'different-release' }]) {
    const e = environment(options), name = `little-kitchen-${manifest.version}`;
    await (await e.caches.open(name)).put('https://kitchen.example/app/index.html', new Response('原有离线版本'));
    let answer; await e.run('message', { data: { type: 'REPAIR_CACHE' }, ports: [{ postMessage: a => answer = a }] });
    assert.equal(answer.ready, false);
    assert.equal(await (await (await e.caches.open(name)).match('https://kitchen.example/app/index.html')).text(), '原有离线版本');
  }
});
