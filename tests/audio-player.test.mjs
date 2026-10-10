import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePlayer } from '../public/js/audio.js';

async function withPlayer(Audio, AudioContext, run) {
  const originalAudio = globalThis.Audio, originalWindow = globalThis.window;
  globalThis.Audio = Audio; globalThis.window = { AudioContext };
  try { await run(new VoicePlayer()); }
  finally { globalThis.Audio = originalAudio; globalThis.window = originalWindow; }
}

test('语音解锁在点击期间直接播放，不等待音效引擎异步恢复', async () => {
  let gesture = true, calls = 0, resume;
  await withPlayer(class {
    pause() {}
    play() { calls++; return gesture ? Promise.resolve() : Promise.reject(new DOMException('需要点击', 'NotAllowedError')); }
  }, class {
    resume() { return new Promise(resolve => { resume = resolve; }); }
  }, async player => {
    const unlocked = player.unlock();
    gesture = false; resume();
    await unlocked;
    assert.equal(calls, 1);
  });
});

test('音效引擎恢复失败不阻断独立的语音播放器', async () => {
  let calls = 0;
  await withPlayer(class {
    pause() {}
    play() { calls++; return Promise.resolve(); }
  }, class {
    resume() { return Promise.reject(new Error('音效引擎不可用')); }
  }, async player => { await player.unlock(); assert.equal(calls, 1); });
});

test('音效引擎创建失败仍可解锁语音', async () => {
  let calls = 0;
  await withPlayer(class {
    pause() {}
    play() { calls++; return Promise.resolve(); }
  }, class {
    constructor() { throw new Error('音效引擎不可用'); }
  }, async player => { await player.unlock(); assert.equal(calls, 1); });
});

test('后台中断后主动恢复会重新解锁，第一次失败后也可再试', async () => {
  let allowed = true, calls = 0;
  await withPlayer(class {
    pause() {}
    play() { calls++; return allowed ? Promise.resolve() : Promise.reject(new DOMException('需要重新点击', 'NotAllowedError')); }
  }, class { resume() { return Promise.resolve(); } }, async player => {
    await player.unlock(); player.stop(); allowed = false;
    await assert.rejects(player.unlock(), { name: 'NotAllowedError' });
    allowed = true; await player.unlock();
    assert.equal(calls, 3);
  });
});

test('已取消的解锁迟到完成不能暂停新的语音或清除错误提示', async () => {
  let pauses = 0; const pending = [], blocked = [];
  await withPlayer(class {
    pause() { pauses++; }
    play() { return new Promise(resolve => pending.push(resolve)); }
  }, class { resume() { return Promise.resolve(); } }, async player => {
    player.onBlocked = value => blocked.push(value);
    const unlocking = player.unlock();
    await Promise.resolve();
    player.stop(); const current = player.url('new'); const before = pauses;
    pending[0](); await unlocking;
    assert.equal(pauses, before); assert.deepEqual(blocked, []); assert.equal(player.active, true);
    pending[1](); await Promise.resolve(); player.audio.onended();
    assert.equal(await current, true);
  });
});

test('取消旧音频后迟到的播放拒绝不会覆盖当前音频状态或提示错误', async () => {
  const OriginalAudio = globalThis.Audio, pending = [], blocked = [];
  globalThis.Audio = class {
    pause() {}
    play() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
  };
  try {
    const player = new VoicePlayer(value => blocked.push(value));
    const first = player.url('first');
    player.stop(); assert.equal(await first, false);
    const second = player.url('second');
    pending[0].reject(new Error('旧播放已经取消'));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(blocked, []); assert.equal(player.active, true);
    pending[1].resolve(); await new Promise(resolve => setImmediate(resolve));
    player.audio.onended(); assert.equal(await second, true);
    assert.deepEqual(blocked, [false]); assert.equal(player.active, false);
  } finally { globalThis.Audio = OriginalAudio; }
});
