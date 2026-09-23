import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../public/', import.meta.url);
const fixedWorker = await readFile(new URL('sw.js', root), 'utf8');
const fixedManifest = JSON.parse(await readFile(new URL('asset-manifest.json', root), 'utf8'));
let serveLegacy = false;
// 复刻上一版的响应行为，用于验证已经打不开页面的用户也能收到修复。
const legacyWorker = fixedWorker.replace(fixedManifest.version, 'broken-navigation-fixture')
  .replace("path === './index.html' ? navigationResponse(response) : response", 'response')
  .replace('page ? navigationResponse(page) : fetch(event.request)', 'page || fetch(event.request)');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
// 模拟 Pages 的规范地址跳转，覆盖本地静态服务器没有的部署行为。
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/index.html') return res.writeHead(308, { Location: '/' }).end();
  if (serveLegacy && path === '/sw.js') return res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' }).end(legacyWorker);
  if (serveLegacy && path === '/asset-manifest.json') return res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }).end(JSON.stringify({ ...fixedManifest, version: 'broken-navigation-fixture' }));
  try {
    const file = new URL(path === '/' ? 'index.html' : path.slice(1), root);
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file.pathname)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') console.log(message.text()); });
  await page.goto(url);
  await page.locator('[data-action="start"]:not([disabled])').waitFor({ timeout: 30000 });
  console.log('PASS 首次访问完成离线准备');
  await page.reload();
  await page.locator('[data-action="start"]:not([disabled])').waitFor({ timeout: 10000 });
  console.log('PASS 规范地址跳转后刷新仍可打开');
  await page.close();
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto(url);
  await offlinePage.locator('[data-action="start"]:not([disabled])').waitFor({ timeout: 10000 });
  assert.match(await offlinePage.locator('#offline-status').innerText(), /可以离线玩/);
  console.log('PASS 离线重新打开仍可游玩');
  await context.close();

  serveLegacy = true;
  const recovery = await browser.newContext();
  const recoveryPage = await recovery.newPage();
  await recoveryPage.goto(url);
  await recoveryPage.locator('[data-action="start"]:not([disabled])').waitFor({ timeout: 30000 });
  await recoveryPage.evaluate(async () => {
    localStorage.setItem('recovery-marker', '保留游戏设置');
    const { writeClips } = await import('/js/storage.js');
    await writeClips([{ key: 'rabbit:welcome', blob: new Blob(['test-recording'], { type: 'audio/wav' }) }]);
  });
  const oldWorker = recovery.serviceWorkers()[0];
  await assert.rejects(recoveryPage.reload(), /ERR_FAILED/);
  console.log('PASS 旧版本刷新故障可复现');
  serveLegacy = false;
  const replacementPromise = recovery.waitForEvent('serviceworker');
  await oldWorker.evaluate(() => self.registration.update()).catch(error => {
    if (!/Service worker restarted/.test(error.message)) throw error;
  });
  const replacement = await replacementPromise;
  await replacement.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { clearInterval(poll); reject(new Error('修复版本未自动激活')); }, 15000);
    const poll = setInterval(() => {
      const r = self.registration;
      if (!r.installing && !r.waiting && r.active?.state === 'activated') { clearTimeout(timeout); clearInterval(poll); resolve(); }
    }, 100);
  }));
  await recoveryPage.goto(url);
  await recoveryPage.locator('[data-action="start"]:not([disabled])').waitFor({ timeout: 10000 });
  assert.equal(await recoveryPage.evaluate(() => localStorage.getItem('recovery-marker')), '保留游戏设置');
  assert.equal(await recoveryPage.evaluate(async () => {
    const { getClip } = await import('/js/storage.js');
    const clip = await getClip('rabbit:welcome');
    return clip.blob.text();
  }), 'test-recording');
  console.log('PASS 故障旧版本自动接收修复，设置和录音保留');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
