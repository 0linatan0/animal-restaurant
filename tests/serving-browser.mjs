import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
const page = await context.newPage(), errors = [], checks = [];
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('__fixture');
  if (fixture) { localStorage.setItem('little-kitchen:session', fixture); sessionStorage.removeItem('__fixture'); }
});
page.on('pageerror', e => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('little-kitchen:session')));
const action = name => page.locator(`[data-action="${name}"]`);
const waitStep = step => page.waitForFunction(x => JSON.parse(localStorage.getItem('little-kitchen:session')).review?.step === x, step);
const waitPhase = phase => page.waitForFunction(x => JSON.parse(localStorage.getItem('little-kitchen:session')).phase === x, phase);
async function mockAudio() {
  // 只在专项交互测试控制音频完成时间；完整浏览器验收仍播放和解码真实音频。
  await page.evaluate(async () => {
    const { VoicePlayer } = await import('./js/audio.js');
    window.__played = []; window.__failLine = ''; window.__speechMs = 250;
    VoicePlayer.prototype.play = function(role, lines, replace = true) {
      if (replace) this.stop();
      const epoch = this.epoch;
      return new Promise(resolve => setTimeout(() => {
        if (epoch !== this.epoch) return resolve(false);
        window.__played.push(...lines);
        if (lines.includes(window.__failLine)) { window.__failLine = ''; return resolve(false); }
        resolve(true);
      }, window.__speechMs));
    };
  });
}
async function setup(n = 2, placed = 2) {
  await page.evaluate(async ({ n, placed }) => {
    const { createSession, transition } = await import('./js/model.js');
    let s = createSession({ supply: 'extra', quantity: String(n) }, () => 0);
    for (let i = 0; i < placed; i++) s = transition(s, { type: 'add', food: s.order.food }).state;
    sessionStorage.setItem('__fixture', JSON.stringify(s));
  }, { n, placed });
  await page.reload(); await action('resume').waitFor(); await mockAudio();
  await action('resume').click(); await page.locator('.pause-overlay').waitFor({ state: 'hidden' });
}
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('[data-action="start"]:not([disabled])', { timeout: 30000 });
  await check('家长选择余量明确转换范围并保存，开局多一份', async () => {
    await page.locator('.parent-entry').focus(); await page.keyboard.press('Enter');
    await page.locator('#gate-confirm').click();
    await page.locator('#setting-quantity').selectOption('5');
    await page.locator('#setting-supply').selectOption('extra');
    assert.equal(await page.locator('#setting-quantity').inputValue(), '1-3');
    assert.equal(await page.locator('#setting-hints').isDisabled(), true);
    assert.match(await page.locator('.parent-notice').innerText(), /数量范围已调整/);
    await page.locator('#setting-quantity').selectOption('2');
    await mockAudio(); await page.locator('[data-parent="new"]').click();
    await page.locator('[data-source="pot"]').first().waitFor();
    assert.equal((await state()).stock.length, 3);
  });
  await check('自动逐个数实际盘子，少或多保盘并重申目标', async () => {
    for (const n of [1, 3]) {
      await setup(2, n); await action('submit').click();
      assert.equal(await action('repeat').isDisabled(), true);
      await waitStep('total');
      assert.equal((await state()).counted.length, n); assert.equal(await page.locator('.plate-total strong').innerText(), String(n));
      await waitPhase('active'); assert.equal((await state()).plate.length, n);
      const lines = await page.evaluate(() => window.__played);
      assert.ok(lines.indexOf(`total-dumpling-${n}`) < lines.lastIndexOf('order-dumpling-2'));
      assert.ok(lines.includes(n === 1 ? 'addOne' : 'takeSomeBack'));
    }
  });
  await check('手动接手从一重数，连续点按和同物重复点不重复计数', async () => {
    await setup(3, 3); await action('submit').click(); await waitStep('item');
    await action('reviewManual').click(); await waitStep('waiting'); assert.equal((await state()).counted.length, 0);
    await page.locator('[data-source="plate"]').first().click();
    await page.locator('[data-source="plate"]').nth(1).dispatchEvent('click', { detail: 0 });
    assert.equal((await state()).counted.length, 1);
    await waitStep('waiting'); await page.locator('[data-source="plate"]').first().click(); assert.equal((await state()).counted.length, 1);
    await page.screenshot({ path: 'artifacts/counting-manual.png', fullPage: true });
    await action('reviewAuto').click(); await waitPhase('serving');
    assert.equal((await state()).rounds, 0);
    await page.screenshot({ path: 'artifacts/enjoying.png', fullPage: true });
    await action('advance').click(); assert.equal((await state()).rounds, 1);
    await page.waitForTimeout(3800); assert.equal((await state()).rounds, 1);
  });
  await check('核对刷新和后台暂停保盘，继续后重数，返回装盘取消旧流程', async () => {
    await setup(2, 2); await action('submit').click(); await waitStep('item');
    await action('pause').click(); const paused = await state();
    await page.waitForTimeout(600); assert.equal((await state()).flowId, paused.flowId);
    await page.reload(); await action('resume').waitFor(); await mockAudio(); await action('resume').click(); await waitStep('intro');
    assert.equal((await state()).counted.length, 0);
    await action('reviewBack').click(); await page.locator('[data-source="plate"]').first().click();
    await page.waitForTimeout(700); assert.equal((await state()).phase, 'active'); assert.equal((await state()).plate.length, 1);
  });
  await check('手动数词失败后无声继续解除锁定，失败短句重试不重复计数', async () => {
    await setup(2, 2); await action('submit').click(); await action('reviewManual').click(); await waitStep('waiting');
    await page.evaluate(() => { window.__failLine = 'count-1'; });
    await page.locator('[data-source="plate"]').first().click(); await action('reviewRetry').waitFor();
    assert.equal((await state()).counted.length, 1);
    await action('reviewRetry').click(); await waitStep('waiting'); assert.equal((await state()).counted.length, 1);
    await page.evaluate(() => { window.__failLine = 'count-2'; });
    await page.locator('[data-source="plate"]').nth(1).click(); await action('reviewSilent').waitFor();
    await action('reviewSilent').click(); await waitPhase('serving'); assert.equal((await state()).rounds, 0);
    await action('pause').click(); await page.reload(); await action('resume').waitFor(); await mockAudio(); await action('resume').click();
    await waitPhase('serving'); await action('advance').click(); assert.equal((await state()).rounds, 1);
  });
  await check('总量、目标、反馈和感谢失败均可恢复，不提前享用', async () => {
    for (const [line, placed] of [['total-dumpling-2', 2], ['order-dumpling-2', 1], ['addOne', 1], ['thanks', 2]]) {
      await setup(2, placed); await page.evaluate(line => { window.__failLine = line; }, line);
      await action('submit').click(); await action('reviewRetry').waitFor();
      assert.equal((await state()).phase, 'reviewing'); assert.equal((await state()).lastCue, line);
      await action('reviewRetry').click(); await waitPhase(placed === 2 ? 'serving' : 'active');
    }
  });
  await check('核对和享用小屏无溢出，核心触控至少72px，减少动态效果', async () => {
    await setup(3, 3); await action('submit').click(); await action('reviewManual').click(); await waitStep('waiting');
    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await page.locator('.food-button, .game-controls button').evaluateAll(bs => bs.every(b => { const r = b.getBoundingClientRect(); return r.width >= 72 && r.height >= 72; })));
      await page.screenshot({ path: `artifacts/counting-${viewport.width}.png`, fullPage: true });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await action('reviewAuto').click(); await waitPhase('serving');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator('.enjoy-food').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.screenshot({ path: 'artifacts/enjoying-phone.png', fullPage: true });
  });
  assert.deepEqual(errors, []);
  await writeFile('artifacts/serving-browser-results.json', JSON.stringify({ checks, errors, testedAt: new Date().toISOString() }, null, 2));
  console.log(`完成 ${checks.length} 组新增浏览器验收。`);
} catch (error) {
  await page.screenshot({ path: 'artifacts/serving-failure.png', fullPage: true });
  console.error(await state()); throw error;
} finally { await browser.close(); }
