import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pcmToWav, makePackage, selectLines, reviewHtml } from '../scripts/voice-pack/core.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4185' }, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await Promise.race([once(server.stdout, 'data'), once(server, 'exit').then(() => { throw new Error('测试服务器无法启动'); })]);
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4185');
  // RIFF 长度字节 de ba 会组成合法的双字节 UTF-8；校验必须按字节位置读取 WAVE，不能按解码后的字符位置读取。
  const utf8LengthPcm = Buffer.alloc(113338);
  for (let i = 0; i < utf8LengthPcm.length / 2; i++) utf8LengthPcm.writeInt16LE(Math.round(Math.sin(i * .1) * 1000), i * 2);
  const utf8LengthPackage = makePackage('rabbit', selectLines('rabbit', ['welcome']), new Map([['welcome', pcmToWav(utf8LengthPcm)]]));
  await page.evaluate(async content => {
    const { validateVoicePackage } = await import('/js/audio.js');
    const audioContext = new AudioContext();
    try { await validateVoicePackage(new Blob([content]), audioContext); } finally { await audioContext.close(); }
  }, utf8LengthPackage);
  if (process.env.VOICE_PACK_PATH) {
    const actual = await readFile(process.env.VOICE_PACK_PATH, 'utf8');
    const actualCount = await page.evaluate(async content => {
      const { validateVoicePackage } = await import('/js/audio.js');
      const audioContext = new AudioContext();
      try { return (await validateVoicePackage(new Blob([content]), audioContext)).length; } finally { await audioContext.close(); }
    }, actual);
    assert.ok(actualCount > 0);
  }
  const pcm = Buffer.alloc(12000);
  for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i * .1) * 1000), i * 2);
  const wav = pcmToWav(pcm), lines = selectLines('rabbit'), audio = new Map(lines.map(line => [line.id, wav]));
  const rabbit = makePackage('rabbit', lines, audio), bear = makePackage('bear', selectLines('bear', ['welcome']), audio);
  // 模拟旧版本直接把 Blob 保存到 IndexedDB，确认升级后仍能读取并保留它。
  await page.evaluate(async content => {
    const { validateVoicePackage } = await import('/js/audio.js');
    const { db } = await import('/js/storage.js');
    const audioContext = new AudioContext();
    const [clip] = await validateVoicePackage(new Blob([content]), audioContext);
    await audioContext.close();
    const database = await db();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('clips', 'readwrite');
      transaction.objectStore('clips').put(clip);
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
    });
  }, bear);
  const entry = page.locator('.parent-entry'), box = await entry.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.locator('#gate-confirm').waitFor({ state: 'visible', timeout: 4500 }); await page.mouse.up();
  await page.locator('#gate-confirm').click(); await page.locator('[data-tab="offline"]').click();
  // iPad 从系统文件选择器返回后会失去播放授权；导入校验不能依赖 HTMLAudioElement.play()。
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('当前上下文不允许播放', 'NotAllowedError'));
  });
  await page.locator('#voice-import').setInputFiles({ name: 'rabbit-test.json', mimeType: 'application/json', buffer: Buffer.from(rabbit) });
  await page.locator('[data-parent="confirm-import"]').waitFor();
  assert.equal(await page.evaluate(async () => (await (await import('/js/storage.js')).listClips()).length), 1);
  // 部分 iPad Safari 上，IndexedDB 会以 BlobURLs are not yet supported 拒绝直接保存 Blob。
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function put(value, ...args) {
      if (value?.blob instanceof Blob) throw new DOMException('Failed to store record in an IDBObjectStore: BlobURLs are not yet supported', 'DataCloneError');
      return originalPut.call(this, value, ...args);
    };
  });
  await page.locator('[data-parent="confirm-import"]').click();
  await page.waitForFunction(async () => (await (await import('/js/storage.js')).listClips()).length === 107);
  const summary = await page.evaluate(async () => {
    const storage = await import('/js/storage.js');
    const clips = await storage.listClips(), audioContext = new AudioContext();
    for (const clip of clips) {
      const decoded = await audioContext.decodeAudioData(await clip.blob.arrayBuffer());
      if (decoded.numberOfChannels !== 1 || Math.abs(decoded.duration - .25) > .01) throw new Error('解码不符合预期');
    }
    await audioContext.close();
    const database = await storage.db();
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction('clips').objectStore('clips').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rabbitRecord = records.find(record => record.key === 'rabbit/welcome');
    const bearRecord = records.find(record => record.key === 'bear/welcome');
    return {
      rabbit: clips.filter(c => c.key.startsWith('rabbit/')).length,
      bear: clips.filter(c => c.key.startsWith('bear/')).length,
      rabbitUsesBytes: rabbitRecord?.bytes instanceof ArrayBuffer && !('blob' in rabbitRecord),
      legacyBearUsesBlob: bearRecord?.blob instanceof Blob,
    };
  });
  assert.deepEqual(summary, { rabbit: 106, bear: 1, rabbitUsesBytes: true, legacyBearUsesBlob: true });
  const broken = JSON.parse(rabbit); broken.clips[1].data = Buffer.from('bad wav').toString('base64');
  await page.locator('#voice-import').setInputFiles({ name: 'broken-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(broken)) });
  await page.getByText('未导入：语音包中的录音不是可移植的 WAV 格式。', { exact: true }).waitFor();
  assert.equal(await page.evaluate(async () => (await (await import('/js/storage.js')).listClips()).length), 107);
  await context.setOffline(true);
  assert.equal(await page.evaluate(async () => {
    const clip = await (await import('/js/storage.js')).getClip('rabbit/welcome');
    const ac = new AudioContext(); const decoded = await ac.decodeAudioData(await clip.blob.arrayBuffer()); await ac.close(); return decoded.duration;
  }), .25);
  const reviewPage = await context.newPage();
  await reviewPage.setContent(reviewHtml('rabbit', lines, audio));
  assert.equal(await reviewPage.locator('audio').count(), 106);
  assert.deepEqual(errors, []);
  console.log('PASS 全量包浏览器解码、iPad Blob 存储限制、旧录音兼容、确认前不写入、导入小兔子保留小熊、损坏包保留原录音、离线读取及试听页。测试音为合成波形，不是家人声音。');
} finally { await browser?.close(); server.kill(); }
