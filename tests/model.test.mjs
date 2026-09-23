import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, transition, judgeOrder, makeOrder, restoreSession, potItems } from '../public/js/model.js';
import { FOOD_IDS, LINES } from '../public/js/catalog.js';
const act = (s, a) => transition(s, a).state;
test('所有35种订单都能正确完成，错误种类优先于数量', () => {
  for (const food of FOOD_IDS) for (let n = 1; n <= 5; n++) {
    const plate = Array.from({ length: n }, (_, i) => ({ id: `${i}`, food }));
    assert.equal(judgeOrder(plate, { food, count: n }), 'correct');
    assert.equal(judgeOrder(plate.slice(1), { food, count: n }), 'less');
    assert.equal(judgeOrder([...plate, { food }], { food, count: n }), 'more');
    assert.equal(judgeOrder([{ food: FOOD_IDS.find(f => f !== food) }], { food, count: n }), `wrong-${food}`);
    assert.ok(LINES[`order-${food}-${n}`]); assert.ok(LINES[`total-${food}-${n}`]);
  }
});
test('数量范围和去重出题', () => {
  for (const quantity of ['1-3', '1-5', '1', '2', '3', '4', '5']) {
    let prev;
    for (let i = 0; i < 50; i++) {
      const o = makeOrder({ quantity }, prev);
      assert.notDeepEqual(o, prev);
      assert.ok(o.count >= 1 && o.count <= (quantity === '1-3' ? 3 : 5));
      if (!quantity.includes('-')) assert.equal(o.count, Number(quantity));
      prev = o;
    }
  }
});
test('容量5、退回、逐物计数和混合食物总量', () => {
  let s = createSession({ mode: 'free' });
  for (let i = 0; i < 6; i++) s = act(s, { type: 'add', food: s.roundFoods[i % 3] });
  assert.equal(s.plate.length, 5);
  s = act(s, { type: 'countStart' });
  const id = s.plate[0].id;
  s = act(s, { type: 'count', id }); s = act(s, { type: 'count', id });
  s = act(s, { type: 'remove', id }); assert.equal(s.counted.length, 1); assert.equal(s.plate.length, 5);
  for (const p of s.plate.slice(1)) s = act(s, { type: 'count', id: p.id });
  assert.equal(s.lastCue, 'total-mixed-5'); assert.equal(s.phase, 'active');
  s = act(s, { type: 'countExit' }); s = act(s, { type: 'remove', id });
  assert.equal(s.plate.length, 4); assert.equal(s.counted.length, 0);
});
test('两次不匹配提供提示，不移动食物', () => {
  let s = createSession(); s = act(s, { type: 'submit' }); s = act(s, { type: 'submit' });
  assert.equal(s.reveal, true); assert.equal(s.hintsUsed, true); assert.equal(s.plate.length, 0);
});
test('分类只能放入对应盘子，六个食物才完成', () => {
  let s = createSession({ mode: 'sort' }); const first = s.remaining[0];
  s = act(s, { type: 'sort', id: first.id, food: s.roundFoods.find(f => f !== first.food) });
  assert.equal(s.remaining.length, 6); assert.equal(s.lastCue, 'sortWrong');
  for (const p of [...s.remaining]) s = act(s, { type: 'sort', id: p.id, food: p.food });
  assert.equal(s.phase, 'serving'); assert.equal(s.remaining.length, 0);
  for (const food of s.roundFoods) assert.equal(s.baskets[food].length, 2);
});
test('三轮自然结束，重复提交和提前推进不会重复计轮', () => {
  let s = createSession(); s = act(s, { type: 'advance' }); assert.equal(s.rounds, 0);
  for (let i = 0; i < 3; i++) {
    for (let n = 0; n < s.order.count; n++) s = act(s, { type: 'add', food: s.order.food });
    s = act(s, { type: 'submit' }); s = act(s, { type: 'submit' });
    assert.equal(s.rounds, i); s = act(s, { type: 'advance' });
  }
  assert.equal(s.phase, 'finished'); assert.equal(s.rounds, 3);
  assert.equal(act(s, { type: 'add', food: 'shrimp' }).phase, 'finished');
});
test('暂停不计时，时间到保留盘子，提醒只发生一次', () => {
  let s = createSession(); s = act(s, { type: 'add', food: s.order.food });
  s = act(s, { type: 'pause' }); s = act(s, { type: 'tick', ms: 5000 }); assert.equal(s.elapsedMs, 0);
  s = act(s, { type: 'resume' }); s.elapsedMs = 239000;
  let r = transition(s, { type: 'tick', ms: 1000 }); assert.deepEqual(r.cues, ['warning']);
  r = transition(r.state, { type: 'tick', ms: 1000 }); assert.deepEqual(r.cues, []);
  s = r.state; s.elapsedMs = 299000; s = act(s, { type: 'tick', ms: 1000 });
  assert.equal(s.phase, 'finished'); assert.equal(s.plate.length, 1); assert.equal(s.finishedReason, 'time');
});
test('全部订单提供正好的实物份数，取走减少，放回增加，不能重复取同一份', () => {
  for (const food of FOOD_IDS) for (let count = 1; count <= 5; count++) {
    const index = FOOD_IDS.indexOf(food);
    let s = createSession({ quantity: String(count) }, () => (index + .1) / FOOD_IDS.length);
    assert.deepEqual(s.order, { food, count });
    const original = potItems(s);
    assert.equal(original.length, count); assert.ok(original.every(p => p.food === food));
    for (const item of original) {
      s = act(s, { type: 'add', food, id: item.id });
      const before = s.plate.length;
      s = act(s, { type: 'add', food, id: item.id });
      assert.equal(s.plate.length, before); assert.equal(potItems(s).length + s.plate.length, count);
    }
    assert.equal(potItems(s).length, 0);
    s = act(s, { type: 'add', food }); assert.equal(s.plate.length, count);
    s = act(s, { type: 'remove', id: original[0].id }); assert.equal(potItems(s).length, 1);
    assert.equal(potItems(s)[0].id, original[0].id);
    s = act(s, { type: 'add', food, id: original[0].id });
    s = act(s, { type: 'submit' }); assert.equal(s.phase, 'serving');
    s = act(s, { type: 'advance' }); assert.equal(potItems(s).length, s.order.count);
  }
});
test('有限库存刷新后不重生，旧版盘子升级后保留', () => {
  let s = createSession({ quantity: '5' }, () => 0);
  s = act(s, { type: 'add', food: 'dumpling' });
  let restored = restoreSession(JSON.stringify(s));
  assert.equal(potItems(restored).length, 4); assert.deepEqual(restored.plate, s.plate);
  delete s.stock; s.plate[0].id = 'p-1';
  restored = restoreSession(JSON.stringify(s));
  assert.equal(potItems(restored).length, 4); assert.equal(restored.plate[0].id, 'p-1');
});
test('自由厨房取走的食物同样不自动补充', () => {
  let s = createSession({ mode: 'free' });
  assert.equal(potItems(s).length, 6);
  const food = s.roundFoods[0];
  for (let i = 0; i < 3; i++) s = act(s, { type: 'add', food });
  assert.equal(s.plate.length, 2); assert.equal(potItems(s).filter(p => p.food === food).length, 0);
});
test('刷新恢复暂停状态，保留已提交阶段并拒绝损坏记录', () => {
  let s = createSession(); s.phase = 'serving';
  const restored = restoreSession(JSON.stringify(s)); assert.equal(restored.paused, true); assert.equal(restored.phase, 'serving');
  assert.equal(restoreSession('{}'), null); assert.equal(restoreSession('{'), null);
});

test('七种食材都能入选三种食材的分类与自由厨房，刷新保留当轮选择', () => {
  for (const mode of ['sort', 'free']) {
    const seen = new Set();
    for (let seed = 1; seed <= 80; seed++) {
      let n = seed;
      const rng = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
      const s = createSession({ mode }, rng);
      assert.equal(s.roundFoods.length, 3); assert.equal(new Set(s.roundFoods).size, 3);
      s.roundFoods.forEach(f => seen.add(f));
      assert.equal(potItems(s).length, 6);
      for (const food of s.roundFoods) assert.equal(potItems(s).filter(p => p.food === food).length, 2);
      assert.deepEqual(restoreSession(JSON.stringify(s)).roundFoods, s.roundFoods);
    }
    assert.deepEqual([...seen].sort(), [...FOOD_IDS].sort());
  }
});
test('三食材旧版存档升级后保留分类盘子及家人录音的稳定台词标识', () => {
  const s = createSession({ mode: 'sort' });
  delete s.roundFoods;
  s.remaining = ['dumpling', 'shrimp', 'wing'].flatMap(food => [0, 1].map(i => ({ id: `${food}-${i}`, food })));
  s.baskets = { dumpling: [], shrimp: [], wing: [] };
  assert.deepEqual(restoreSession(JSON.stringify(s)).roundFoods, ['dumpling', 'shrimp', 'ribs']);
  assert.equal(LINES['order-broccoli-2'].text, '我想吃两朵西蓝花。');
  assert.equal(LINES['order-greens-3'].text, '我想吃三棵青菜。');
  assert.equal(LINES['order-ribs-1'].text, '我想吃一块排骨。');
  assert.equal(LINES['order-wing-1'], undefined);
});

test('鸡翅旧订单迁移为排骨，保留盘子及计数，使用新的排骨台词', () => {
  let s = createSession({ quantity: '3' }, () => 2.1 / FOOD_IDS.length);
  s = act(s, { type: 'add', food: 'ribs' });
  s = act(s, { type: 'countStart' });
  s = act(s, { type: 'count', id: s.plate[0].id });
  s.lastCue = 'order-ribs-3';
  const restored = restoreSession(JSON.stringify(s).replaceAll('ribs', 'wing'));
  assert.equal(restored.order.food, 'ribs'); assert.equal(restored.order.count, 3);
  assert.equal(restored.plate[0].food, 'ribs');
  assert.equal(restored.counted[0], restored.plate[0].id);
  assert.equal(potItems(restored).length, 2);
  assert.equal(restored.lastCue, 'order-ribs-3');
});
