import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LINES } from '../public/js/catalog.js';
import { SAMPLE_IDS, SAMPLE_RATE, selectLines, resolveProfile, requestFingerprint, pcmToWav, inspectWav, makePackage } from '../scripts/voice-pack/core.mjs';
import { requestHeaders, readPcmStream, synthesize, ENDPOINT } from '../scripts/voice-pack/volcengine.mjs';
import { generate, cachedAudio, pack } from '../scripts/voice-pack/runner.mjs';

const profile = { name: 'test', speaker: 'private-speaker-test', model: 'seed-tts-2.0-standard', speechRate: 0, apiKey: 'private-api-key-test' };
const pcm = (seconds = .25) => {
  const bytes = Buffer.alloc(Math.round(SAMPLE_RATE * seconds) * 2);
  for (let i = 0; i < bytes.length / 2; i++) bytes.writeInt16LE(Math.round(Math.sin(i * .1) * 1000), i * 2);
  return bytes;
};
const wire = events => events.map(e => JSON.stringify(e)).join('\n');
async function* chunks(text, length = 37) { const bytes = Buffer.from(text); for (let i = 0; i < bytes.length; i += length) yield bytes.subarray(i, i + length); }
const successful = bytes => wire([{ code: 0, data: bytes.toString('base64') }, { code: 20000000, data: null }]);

test('台词目录完整，代表样音覆盖数词和七种食物，拒绝归档和未知台词', () => {
  const lines = selectLines('rabbit');
  assert.equal(lines.length, 106); assert.equal(lines.reduce((n, l) => n + [...l.text].length, 0), 885);
  assert.equal(selectLines('bear', SAMPLE_IDS).length, 15);
  for (const n of [1, 2, 3, 4, 5]) assert.ok(SAMPLE_IDS.includes(`count-${n}`));
  assert.throws(() => selectLines('fox'), /角色/);
  for (const ids of [[], ['wrong-wing'], ['__proto__'], ['welcome', 'welcome']]) assert.throws(() => selectLines('rabbit', ids), /台词/);
});

test('profile 与角色分离，配置不接受直接嵌入凭据', () => {
  const config = { profiles: { mine: { speakerEnv: 'MY_SPEAKER' } } };
  assert.equal(resolveProfile(config, 'mine', {}, { requireSpeaker: false }).speaker, undefined);
  assert.throws(() => resolveProfile(config, 'mine', {}), /MY_SPEAKER/);
  assert.equal(resolveProfile(config, 'mine', { MY_SPEAKER: 'S_test' }).speaker, 'S_test');
  assert.throws(() => resolveProfile({ profiles: { mine: { speakerEnv: 'MY_SPEAKER', apiKey: 'secret' } } }, 'mine', {}), /未知字段/);
  assert.throws(() => resolveProfile(config, '../mine', {}), /profile/);
});

test('鉴权同时兼容新版 API Key 与旧版 App ID / Token', () => {
  assert.equal(requestHeaders(profile)['X-Api-Key'], profile.apiKey);
  const old = requestHeaders({ appId: 'app-test', accessToken: 'token-test' });
  assert.equal(old['X-Api-App-Id'], 'app-test'); assert.equal(old['X-Api-Access-Key'], 'token-test');
  assert.equal(old['X-Api-Resource-Id'], 'seed-icl-2.0');
  assert.throws(() => requestHeaders({}), /缺少/);
});

test('PCM 分块合并后封装，成功尾行无需换行', async () => {
  const bytes = pcm();
  const response = wire([{ code: 0, data: bytes.subarray(0, 17).toString('base64') }, { code: 0, data: bytes.subarray(17).toString('base64') }, { code: 20000000 }]);
  const actual = await readPcmStream(chunks(response, 13));
  assert.deepEqual(actual, bytes);
  assert.equal(inspectWav(pcmToWav(actual)).duration, .25);
});

test('拒绝服务错误、截断、畸形 base64 和结束后的额外数据，不泄露错误内容', async () => {
  await assert.rejects(readPcmStream(chunks(wire([{ code: 0, data: pcm().toString('base64') }]))), /成功终止/);
  await assert.rejects(readPcmStream(chunks(wire([{ code: 45000000, message: profile.apiKey }]))), e => e.message.includes('45000000') && !e.message.includes(profile.apiKey));
  await assert.rejects(readPcmStream(chunks(wire([{ code: 0, data: 'invalid@' }]))), /base64/);
  await assert.rejects(readPcmStream(chunks('not-json')), /完整 JSON/);
  await assert.rejects(readPcmStream(chunks(`${successful(pcm())}\n{"code":0}`)), /额外响应/);
});

test('WAV 拒绝过短、过长、空音频、全静音和损坏声道', () => {
  for (const bytes of [Buffer.alloc(0), Buffer.alloc(1), pcm(.1), pcm(15.01), Buffer.alloc(SAMPLE_RATE)]) assert.throws(() => pcmToWav(bytes));
  assert.equal(inspectWav(pcmToWav(pcm(.15))).duration, .15);
  assert.equal(inspectWav(pcmToWav(pcm(15))).duration, 15);
  const wav = pcmToWav(pcm()); wav.writeUInt16LE(2, 22); assert.throws(() => inspectWav(wav), /单声道/);
});

test('接口固定官方地址并阻止重定向，只发送合成所需字段', async () => {
  let calls = 0;
  const wav = await synthesize(profile, LINES.welcome, { fetchImpl: async (url, request) => {
    calls++; assert.equal(url, ENDPOINT); assert.equal(request.redirect, 'error');
    assert.equal(request.headers['X-Api-Key'], profile.apiKey);
    const body = JSON.parse(request.body);
    assert.equal(body.req_params.speaker, profile.speaker); assert.equal(body.req_params.audio_params.format, 'pcm');
    return new Response(successful(pcm()));
  } });
  assert.equal(calls, 1); assert.equal(inspectWav(wav).duration, .25);
  await assert.rejects(synthesize(profile, LINES.welcome, { fetchImpl: async () => new Response(profile.apiKey, { status: 403 }) }), e => e.message.includes('403') && !e.message.includes(profile.apiKey));
});

test('真实音色值、文本、语速和模型改变缓存，角色复用不受 profile 标签影响', () => {
  const original = requestFingerprint(profile, LINES.welcome);
  for (const change of [{ speaker: 'other-speaker' }, { speechRate: -10 }, { model: 'seed-tts-2.0-expressive' }]) {
    assert.notEqual(requestFingerprint({ ...profile, ...change }, LINES.welcome), original);
  }
  assert.notEqual(requestFingerprint(profile, { ...LINES.welcome, text: '新台词' }), original);
  assert.equal(requestFingerprint({ ...profile, name: 'other' }, LINES.welcome), original);
});

test('失败保留已完成句子，断点复用、损坏恢复、单句重做和完整打包', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'kitchen-voice-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const lines = selectLines('rabbit', ['welcome', 'count-1']), wav = pcmToWav(pcm());
  let calls = 0;
  const options = { directory, profile, role: 'rabbit', lines, log: () => {} };
  await assert.rejects(generate({ ...options, synth: async () => { if (++calls === 2) throw new Error('测试中断'); return wav; } }), /测试中断/);
  assert.deepEqual(await cachedAudio(directory, profile, lines[0]), wav);
  await assert.rejects(pack({ ...options, reviewed: true }), /缺少台词 count-1/);
  const result = await generate({ ...options, synth: async () => { calls++; return wav; } });
  assert.equal(calls, 3); assert.equal(result.reused, 1); assert.equal(result.generated, 1);
  assert.equal(await cachedAudio(directory, { ...profile, speaker: 'changed' }, lines[0]), null);
  const base = join(directory, 'cache', `${requestFingerprint(profile, lines[0])}.wav`);
  await writeFile(base, pcmToWav(pcm(.3)));
  assert.equal(await cachedAudio(directory, profile, lines[0]), null);
  assert.equal((await generate({ ...options, synth: async () => wav })).generated, 1);
  assert.equal((await generate({ ...options, lines: [lines[0]], force: true, synth: async () => wav })).generated, 1);
  await assert.rejects(pack(options), /试听/);
  const output = await pack({ ...options, reviewed: true, partial: true });
  const content = await readFile(output.output, 'utf8'), packageData = JSON.parse(content);
  assert.equal(packageData.format, 'little-kitchen-voices'); assert.equal(packageData.version, 1);
  assert.deepEqual(packageData.clips.map(c => c.key), ['rabbit/welcome', 'rabbit/count-1']);
  for (const file of await readdir(join(directory, 'cache'))) {
    if (file.endsWith('.json')) {
      const metadata = await readFile(join(directory, 'cache', file), 'utf8');
      assert.ok(!metadata.includes(profile.speaker) && !metadata.includes(profile.apiKey));
    }
  }
  assert.ok(!content.includes(profile.speaker) && !content.includes(profile.apiKey));
});

test('单角色包只使用当前角色稳定 ID，缺句拒绝，最大音频全量超限拒绝', () => {
  const lines = selectLines('bear', ['welcome']), wav = pcmToWav(pcm());
  const result = JSON.parse(makePackage('bear', lines, new Map([['welcome', wav]])));
  assert.equal(result.clips[0].key, 'bear/welcome');
  assert.throws(() => makePackage('bear', lines, new Map()), /缺少/);
  const all = selectLines('rabbit'), long = pcmToWav(pcm(15));
  assert.throws(() => makePackage('rabbit', all, new Map(all.map(l => [l.id, long]))), /80 MiB/);
});
