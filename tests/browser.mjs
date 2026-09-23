import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, permissions: ['microphone'], acceptDownloads: true, hasTouch: true });
await context.addInitScript(() => {
  if (!localStorage.getItem('little-kitchen:settings')) localStorage.setItem('little-kitchen:settings', JSON.stringify({ mode: 'order', quantity: '3', hints: 'full', minutes: 5 }));
  window.__testStreams = [];
  const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (...args) => { const stream = await capture(...args); window.__testStreams.push(stream); return stream; };
});
let page = await context.newPage();
const errors = [], external = [], checks = [];
const watch = p => { p.on('pageerror', e => errors.push(e.message)); p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4173') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); }); };
watch(page);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('little-kitchen:session')));
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
async function parents() {
  const b = page.locator('.parent-entry'); const r = await b.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
  await page.locator('#gate-confirm').waitFor({ state: 'visible', timeout: 4500 }); await page.mouse.up();
  await page.locator('#gate-confirm').click(); await page.locator('#setting-mode').waitFor();
}
async function newMode(mode) {
  await parents(); await page.locator('#setting-mode').selectOption(mode);
  await page.locator('[data-parent="new"]').click(); await page.locator('.pot-items').waitFor();
  await page.waitForFunction(m => JSON.parse(localStorage.getItem('little-kitchen:session')).mode === m, mode);
}
async function drag(from, to) {
  const a = await from.boundingBox(), b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
}
async function waitRound(round) { await page.waitForFunction(n => JSON.parse(localStorage.getItem('little-kitchen:session')).rounds === n, round, { timeout: 45000 }); }
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://127.0.0.1:4173'); await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-action="start"]:not([disabled])', { timeout: 30000 });
  await page.screenshot({ path: 'artifacts/home-tablet.png', fullPage: true });
  await check('完整离线资源就绪，首页可开始', async () => { assert.match(await page.locator('#offline-status').innerText(), /可以离线玩/); await page.locator('[data-action="start"]').click(); await page.locator('.pot-items').waitFor(); });
  await check('点击取放及拖动往返', async () => {
    const { food, count } = (await state()).order;
    assert.equal(await page.locator('[data-source="pot"]').count(), count);
    await page.locator(`[data-source="pot"][data-food="${food}"]`).first().click(); assert.equal((await state()).plate.length, 1);
    assert.equal(await page.locator('[data-source="pot"]').count(), count - 1);
    await page.locator('[data-source="plate"]').click(); assert.equal((await state()).plate.length, 0);
    assert.equal(await page.locator('[data-source="pot"]').count(), count);
    await drag(page.locator(`[data-source="pot"][data-food="${food}"]`).first(), page.locator('[data-drop="plate"]'));
    assert.equal((await state()).plate[0].food, food);
    await drag(page.locator('[data-source="plate"]').first(), page.locator('[data-drop="pot"]')); assert.equal((await state()).plate.length, 0);
  });
  await check('两次不匹配后辅助提示，盘内不被自动代答', async () => {
    await page.locator('[data-action="submit"]').click(); await page.locator('[data-action="submit"]').click();
    const s = await state(); assert.equal(s.reveal, true); assert.equal(s.plate.length, 0);
  });
  await check('双指同时触摸只取一个食物', async () => {
    const a = await page.locator('[data-source="pot"]').nth(0).boundingBox(), b = await page.locator('[data-source="pot"]').nth(2).boundingBox();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + 35, y: a.y + 35, id: 1 }, { x: b.x + 35, y: b.y + 35, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal((await state()).plate.length, 1); await page.locator('[data-source="plate"]').click();
    await cdp.detach();
  });
  await check('逐个计数去重，退出后可以继续修改', async () => {
    const { food } = (await state()).order;
    for (let i = 0; i < 3; i++) await page.locator(`[data-source="pot"][data-food="${food}"]`).first().click();
    await page.locator('[data-action="countStart"]').click();
    const item = page.locator('[data-source="plate"]').first(); await item.click(); await item.click();
    assert.equal((await state()).counted.length, 1); assert.equal((await state()).plate.length, 3);
    await page.locator('[data-source="plate"]').nth(1).click(); await page.locator('[data-source="plate"]').nth(2).click();
    assert.equal((await state()).counted.length, 3);
    await page.locator('[data-action="countExit"]').click();
    while ((await state()).plate.length) await page.locator('[data-source="plate"]').first().click();
  });
  await check('刷新后盘子和订单恢复，等待主动继续', async () => {
    await page.locator('[data-source="pot"]').first().click(); const before = await state();
    await page.reload(); await page.locator('[data-action="resume"]').waitFor();
    const after = await state(); assert.deepEqual(after.plate, before.plate); assert.deepEqual(after.order, before.order); assert.equal(after.paused, true);
    assert.equal(await page.locator('[data-source="pot"]').count(), after.order.count - after.plate.length);
    await page.locator('[data-action="resume"]').click(); await page.locator('[data-source="plate"]').first().click();
  });
  await check('正确订单三轮后自然收工', async () => {
    for (let round = 1; round <= 3; round++) {
      const order = (await state()).order;
      for (let i = 0; i < order.count; i++) await page.locator(`[data-source="pot"][data-food="${order.food}"]`).first().click();
      await page.locator('[data-action="submit"]').click(); await waitRound(round);
    }
    await page.locator('.end-page').waitFor(); assert.equal(await page.locator('[data-action="start"]').count(), 0);
    await page.screenshot({ path: 'artifacts/finished.png', fullPage: true });
  });
  await check('分类支持先选再放、错误退回和拖动', async () => {
    await newMode('sort'); let s = await state(); const first = s.remaining[0]; const wrong = s.roundFoods.find(f => f !== first.food);
    await page.locator(`[data-item="${first.id}"]`).click(); await page.locator(`[data-target="${wrong}"]`).click(); assert.equal((await state()).remaining.length, 6);
    await drag(page.locator(`[data-item="${first.id}"]`), page.locator(`[data-target="${first.food}"]`)); assert.equal((await state()).remaining.length, 5);
    s = await state();
    for (const item of s.remaining) { await page.locator(`[data-item="${item.id}"]`).click(); await page.locator(`[data-target="${item.food}"]`).click(); }
    await waitRound(1); await page.screenshot({ path: 'artifacts/sorting.png', fullPage: true });
  });
  await check('自由厨房接受混合搭配', async () => {
    await newMode('free');
    for (const food of (await state()).roundFoods) await page.locator(`[data-source="pot"][data-food="${food}"]`).first().click();
    await page.screenshot({ path: 'artifacts/game-tablet.png', fullPage: true });
    await page.locator('[data-action="submit"]').click(); await waitRound(1); assert.equal((await state()).mode, 'free');
  });
  await check('横竖屏不丢状态，无横向溢出，食物触控至少72px', async () => {
    await page.locator('[data-source="pot"]').first().click();
    const before = (await state()).plate;
    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      assert.deepEqual((await state()).plate, before);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await page.locator('.food-button').evaluateAll(buttons => buttons.every(b => { const r = b.getBoundingClientRect(); return r.width >= 72 && r.height >= 72; })));
      await page.screenshot({ path: `artifacts/game-${viewport.width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1024, height: 768 });
  });
  await check('家长区配置和录音界面', async () => {
    await parents(); await page.locator('[data-tab="voices"]').click(); await page.locator('#voice-role').selectOption('bear');
    await page.screenshot({ path: 'artifacts/parents-voices.png', fullPage: true });
  });
  if (process.env.TEST_MIC === '1') await check('模拟麦克风录音、试听保存与释放', async () => {
    await page.locator('[data-parent="record"]').click();
    await page.waitForFunction(() => document.querySelector('#record-status')?.textContent.includes('正在录制'));
    await page.waitForTimeout(1800); await page.locator('[data-parent="stop-record"]').click();
    await page.locator('[data-parent="save-record"]').waitFor({ timeout: 10000 });
    await page.locator('[data-parent="save-record"]').click();
    await page.waitForFunction(() => document.querySelector('.parent-notice')?.textContent.includes('已保存'));
    assert.match(await page.locator('.script-card').innerText(), /家人配音/);
    assert.ok(await page.evaluate(() => window.__testStreams.length > 0 && window.__testStreams.every(s => s.getTracks().every(t => t.readyState === 'ended'))));
  });
  await check('语音包备份、损坏包不覆盖、合法包确认导入', async () => {
    // 使用真实可解码 PCM 测试跨浏览器通用的备份格式。
    await page.evaluate(async () => {
      const { pcmWav } = await import('./js/audio.js'), { writeClips } = await import('./js/storage.js');
      const samples = Float32Array.from({ length: 22050 }, (_, i) => .12 * Math.sin(i * .05));
      await writeClips([{ key: 'rabbit/welcome', blob: pcmWav(samples), updatedAt: new Date().toISOString() }]);
    });
    await page.locator('[data-tab="offline"]').click();
    const downloadPromise = page.waitForEvent('download'); await page.locator('[data-parent="export"]').click();
    const downloaded = await downloadPromise; await downloaded.saveAs('artifacts/test-voice-pack.json');
    const before = await page.evaluate(async () => (await (await import('./js/storage.js')).listClips()).map(c => [c.key, c.blob.size]));
    await page.locator('#voice-import').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"bad"}') });
    await page.waitForFunction(() => document.querySelector('.parent-notice').textContent.includes('未导入'));
    const after = await page.evaluate(async () => (await (await import('./js/storage.js')).listClips()).map(c => [c.key, c.blob.size])); assert.deepEqual(after, before);
    await page.locator('#voice-import').setInputFiles('artifacts/test-voice-pack.json');
    await page.locator('[data-parent="confirm-import"]').waitFor(); await page.locator('[data-parent="confirm-import"]').click();
    await page.waitForFunction(() => document.querySelector('.parent-notice').textContent.includes('已导入'));
    await page.locator('[data-parent="close"]').click();
  });
  await check('全部默认音频可解码', async () => {
    const result = await page.evaluate(async () => {
      const { LINES, ROLES, defaultAudio } = await import('./js/catalog.js'); const ctx = new AudioContext();
      let count = 0;
      for (const role of Object.keys(ROLES)) for (const line of Object.keys(LINES)) { const a = await ctx.decodeAudioData(await (await fetch(defaultAudio(role, line))).arrayBuffer()); if (a.duration <= .1) throw new Error(`${role}/${line}`); count++; }
      await ctx.close(); return count;
    }); assert.equal(result, Object.keys((await import('../public/js/catalog.js')).LINES).length * 2);
  });
  await check('断网新页面冷启动、音频Range及父母录音可用', async () => {
    await context.setOffline(true); await page.close(); page = await context.newPage(); watch(page);
    await page.goto('http://127.0.0.1:4173/'); await page.locator('[data-action="resume"]').waitFor(); await page.locator('[data-action="resume"]').click();
    await page.locator('[data-source="pot"]').first().click(); assert.ok((await state()).plate.length > 0);
    const result = await page.evaluate(async () => {
      const response = await fetch('./assets/audio/rabbit/order-dumpling-3.mp3', { headers: { Range: 'bytes=0-99' } });
      const clips = await (await import('./js/storage.js')).listClips();
      const ctx = new AudioContext(); const decoded = await ctx.decodeAudioData(await clips.find(c => c.key === 'rabbit/welcome').blob.arrayBuffer()); await ctx.close();
      return { status: response.status, bytes: (await response.arrayBuffer()).byteLength, duration: decoded.duration };
    }); assert.equal(result.status, 206); assert.equal(result.bytes, 100); assert.ok(result.duration > 0);
    await page.screenshot({ path: 'artifacts/offline-game.png', fullPage: true });
    await context.setOffline(false);
  });
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await writeFile('artifacts/browser-results.json', JSON.stringify({ checks, errors, external, testedAt: new Date().toISOString() }, null, 2));
  console.log(`完成 ${checks.length} 组浏览器验收。`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/failure.png', fullPage: true }).catch(() => {});
  console.error('失败时状态', await state().catch(() => null));
  console.error('页面错误', errors);
  throw error;
} finally { await browser.close(); }
