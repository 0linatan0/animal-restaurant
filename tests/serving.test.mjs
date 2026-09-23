import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, transition, restoreSession, normalizeSettings, potItems } from '../public/js/model.js';
import { FOOD_IDS } from '../public/js/catalog.js';
const act = (s, a) => transition(s, a).state;
const done = s => act(s, { type: 'reviewDone', token: s.flowId });
function fill(s, n = s.order.count) {
  for (let i = 0; i < n; i++) s = act(s, { type: 'add', food: s.order.food });
  return s;
}
function reviewed(s) {
  for (let i = 0; s.phase === 'reviewing' && i < 20; i++) s = done(s);
  return s;
}
test('余量档位全部21种订单库存多一个，取放不复制，设置明确限制1～3', () => {
  assert.deepEqual(normalizeSettings({ supply: 'extra', quantity: '5', hints: 'simple' }), { mode: 'order', supply: 'extra', quantity: '1-3', hints: 'full', minutes: 5 });
  for (const food of FOOD_IDS) for (let n = 1; n <= 3; n++) {
    let s = createSession({ supply: 'extra', quantity: String(n) }, () => (FOOD_IDS.indexOf(food) + .1) / FOOD_IDS.length);
    assert.equal(s.stock.length, n + 1); assert.equal(s.order.food, food);
    s = fill(s, n + 1); assert.equal(potItems(s).length, 0);
    const id = s.plate[0].id;
    s = act(s, { type: 'remove', id }); assert.equal(potItems(s)[0].id, id);
    assert.equal(s.plate.length + potItems(s).length, n + 1);
    assert.ok(restoreSession(s));
  }
});
test('自动核对逐个数实际盘子，先报总量再反馈，错误保盘', () => {
  for (const n of [1, 2, 3]) {
    let s = fill(createSession({ supply: 'extra', quantity: '2' }), n);
    const plate = s.plate;
    s = act(s, { type: 'submit' }); assert.equal(s.phase, 'reviewing');
    for (let i = 1; i <= n; i++) { s = done(s); assert.equal(s.lastCue, `count-${i}`); assert.equal(s.counted.length, i); }
    s = done(s); assert.equal(s.lastCue, `total-${s.order.food}-${n}`);
    s = reviewed(s);
    assert.equal(s.phase, n === 2 ? 'serving' : 'active'); assert.deepEqual(s.plate, plate);
    assert.equal(s.rounds, 0);
  }
});
test('手动切换重数、播放期间锁定、重复物体不重复数、旧回调无效', () => {
  let s = act(fill(createSession({ quantity: '3' })), { type: 'submit' });
  s = done(s); const oldToken = s.flowId;
  s = act(s, { type: 'reviewManual' }); assert.equal(s.counted.length, 0);
  assert.deepEqual(act(s, { type: 'reviewDone', token: oldToken }), s);
  s = done(s); assert.equal(s.review.step, 'waiting');
  assert.deepEqual(done(s), s);
  s = act(s, { type: 'count', id: s.plate[0].id });
  assert.equal(s.counted.length, 1);
  assert.deepEqual(act(s, { type: 'count', id: s.plate[1].id }), s);
  s = done(s);
  assert.deepEqual(act(s, { type: 'count', id: s.plate[0].id }), s);
  s = act(s, { type: 'reviewAuto' }); assert.equal(s.counted.length, 0);
  s = reviewed(s); assert.equal(s.phase, 'serving');
});
test('错误语音可以重试或无声继续，已标记物体不重复计数', () => {
  let s = act(fill(createSession({ quantity: '2' })), { type: 'submit' });
  s = act(s, { type: 'reviewManual' }); s = done(s);
  s = act(s, { type: 'count', id: s.plate[0].id });
  s = act(s, { type: 'reviewError', token: s.flowId });
  assert.equal(s.review.error, true); assert.deepEqual(done(s), s);
  s = act(s, { type: 'reviewRetry' }); assert.equal(s.counted.length, 1);
  s = act(s, { type: 'reviewError', token: s.flowId });
  s = act(s, { type: 'reviewSilent' }); assert.equal(s.review.silent, true);
  s = done(s); assert.equal(s.review.step, 'waiting');
  s = act(s, { type: 'count', id: s.plate[1].id }); s = reviewed(s);
  assert.equal(s.phase, 'serving');
});
test('核对暂停刷新重数，返回装盘取消旧步骤，享用重复完成只算一轮', () => {
  let s = act(fill(createSession({ quantity: '2' })), { type: 'submit' });
  s = done(s); const oldToken = s.flowId;
  s = act(restoreSession(s), { type: 'resume' }); assert.equal(s.counted.length, 0);
  assert.deepEqual(act(s, { type: 'reviewDone', token: oldToken }), s);
  s = act(s, { type: 'reviewBack' }); assert.equal(s.phase, 'active'); assert.equal(s.plate.length, 2);
  s = act(s, { type: 'submit' }); s = reviewed(s);
  s = act(restoreSession(s), { type: 'resume' }); assert.equal(s.phase, 'serving');
  s = act(s, { type: 'skip', round: 0 });
  assert.equal(s.rounds, 1);
  assert.deepEqual(act(s, { type: 'advance', round: 0 }), s);
  assert.deepEqual(act(s, { type: 'skip', round: 0 }), s);
});
test('提醒不打断核对，时间上限立即收尾并使旧回调失效', () => {
  let s = act(fill(createSession({ quantity: '2' })), { type: 'submit' });
  s.elapsedMs = 239000;
  let r = transition(s, { type: 'tick', ms: 1000 }); assert.deepEqual(r.cues, []); assert.equal(r.state.warningPending, true);
  s = act(r.state, { type: 'reviewBack' }); assert.equal(s.lastCue, 'warning');
  s = act(s, { type: 'submit' }); const token = s.flowId;
  s.elapsedMs = 299000; s = act(s, { type: 'tick', ms: 1000 });
  assert.equal(s.phase, 'finished'); assert.equal(s.plate.length, 2);
  assert.deepEqual(act(s, { type: 'reviewDone', token }), s);
});
test('旧档位会话迁移，库存不合法和核对字段损坏拒绝恢复', () => {
  const old = createSession({ quantity: '2' }); old.version = 1;
  delete old.flowId; delete old.review; delete old.settings.supply;
  assert.equal(restoreSession(old).settings.supply, 'exact');
  const bad = createSession({ supply: 'extra', quantity: '2' }); bad.stock.pop(); assert.equal(restoreSession(bad), null);
  const review = act(fill(createSession({ quantity: '2' })), { type: 'submit' });
  review.review.step = 'bad'; assert.equal(restoreSession(review), null);
});
