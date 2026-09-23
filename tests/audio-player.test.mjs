import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePlayer } from '../public/js/audio.js';

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
