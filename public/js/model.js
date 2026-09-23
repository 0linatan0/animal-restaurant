import { DEFAULT_SETTINGS, FOOD_IDS, LINES } from './catalog.js';

export function normalizeSettings(input = {}) {
  const supply = input.supply === 'extra' ? 'extra' : 'exact';
  const extra = supply === 'extra' && !['sort', 'free'].includes(input.mode);
  return {
    supply,
    mode: ['order', 'sort', 'free'].includes(input.mode) ? input.mode : DEFAULT_SETTINGS.mode,
    quantity: extra ? (['1', '2', '3'].includes(input.quantity) ? input.quantity : '1-3') : ['1-3', '1-5', '1', '2', '3', '4', '5'].includes(input.quantity) ? input.quantity : '1-5',
    hints: !extra && input.hints === 'simple' ? 'simple' : 'full',
    minutes: [5, 8, 10].includes(Number(input.minutes)) ? Number(input.minutes) : 5,
  };
}
export function quantities(settings) {
  return settings.quantity === '1-5' ? [1, 2, 3, 4, 5] : settings.quantity === '1-3' ? [1, 2, 3] : [Number(settings.quantity)];
}
export function makeOrder(settings, previous, rng = Math.random) {
  const all = FOOD_IDS.flatMap(food => quantities(settings).map(count => ({ food, count })));
  const choices = all.filter(o => !previous || o.food !== previous.food || o.count !== previous.count);
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
}
function shuffle(items, rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sortItems(foods, rng) {
  return shuffle(foods.flatMap(food => [0, 1].map(i => ({ id: `${food}-${i}`, food }))), rng);
}
const emptyBaskets = foods => Object.fromEntries(foods.map(food => [food, []]));
function makeStock(mode, order, plate = [], foods = FOOD_IDS.slice(0, 3), supply = 'exact') {
  // 每个食物拥有固定身份，取放只改变位置，不凭空复制。
  const stock = [...plate];
  for (const food of mode === 'order' ? [order.food] : foods) {
    const total = mode === 'order' ? (food === order.food ? order.count + (supply === 'extra' ? 1 : 0) : 0) : 2;
    const placed = plate.filter(p => p.food === food).length;
    for (let i = placed; i < total; i++) stock.push({ id: `stock-${food}-${i}`, food });
  }
  return stock;
}
export function potItems(s) {
  if (s.mode === 'sort') return s.remaining;
  return s.stock.filter(item => !s.plate.some(p => p.id === item.id));
}
export function createSession(settings, rng = Math.random) {
  const normalized = normalizeSettings(settings);
  const order = makeOrder(normalized, null, rng);
  // 每轮仅呈现三种，扩充食谱不增加单屏辨认和触摸负担。
  const roundFoods = shuffle(FOOD_IDS, rng).slice(0, 3);
  return {
    version: 2, flowId: 0, review: null, warningPending: false, settings: normalized, mode: normalized.mode, role: 'rabbit',
    order, roundFoods, stock: makeStock(normalized.mode, order, [], roundFoods, normalized.supply), plate: [], nextId: 1,
    remaining: sortItems(roundFoods, rng), baskets: emptyBaskets(roundFoods), selected: null,
    phase: 'active', paused: false, counted: [], counting: false, attempts: 0, reveal: false,
    rounds: 0, elapsedMs: 0, warned: false, quantitiesSeen: [], hintsUsed: false,
    lastCue: '', finishedReason: '', startedAt: new Date().toISOString(),
  };
}
export function introCue(s) { return s.mode === 'order' ? `order-${s.order.food}-${s.order.count}` : s.mode === 'sort' ? 'sortIntro' : 'freeIntro'; }
export function totalCue(plate) {
  return `total-${plate.every(p => p.food === plate[0].food) ? plate[0].food : 'mixed'}-${plate.length}`;
}
export function judgeOrder(plate, order) {
  if (plate.some(p => p.food !== order.food)) return `wrong-${order.food}`;
  if (plate.length < order.count) return 'less';
  if (plate.length > order.count) return 'more';
  return 'correct';
}
export function transition(previous, action, rng = Math.random) {
  const s = structuredClone(previous), cues = [];
  const say = line => { s.lastCue = line; cues.push(line); };
  const finish = reason => { s.flowId++; s.review = null; s.warningPending = false; s.phase = 'finished'; s.finishedReason = reason; s.paused = false; s.counting = false; say('goodbye'); };
  const resetCount = () => { s.counting = false; s.counted = []; };
  const flushWarning = () => { if (s.warningPending) { s.warningPending = false; say('warning'); } };
  const beginReview = mode => {
    const silent = s.review?.silent || false;
    s.phase = 'reviewing'; s.counting = false; s.counted = []; s.flowId++;
    s.review = { mode, step: 'intro', error: false, silent };
    if (mode === 'manual') s.hintsUsed = true;
    say(mode === 'manual' ? 'countHelp' : 'reviewIntro');
  };
  const reviewStep = (step, line) => { s.review.step = step; s.flowId++; if (line) say(line); };
  const nextItem = () => {
    s.counted.push(s.plate.find(p => !s.counted.includes(p.id)).id);
    reviewStep('item', `count-${s.counted.length}`);
  };
  const track = () => {
    if (s.mode === 'order' && !s.quantitiesSeen.includes(s.order.count)) s.quantitiesSeen.push(s.order.count);
  };
  if (action.type === 'finish') { if (s.phase !== 'finished') finish('parent'); return { state: s, cues }; }
  if (action.type === 'pause') { s.flowId++; s.paused = true; return { state: s, cues }; }
  if (action.type === 'resume') { if (s.paused && s.phase !== 'finished') { s.paused = false; s.flowId++; if (s.phase === 'reviewing') beginReview(s.review.mode); } return { state: s, cues }; }
  if (s.phase === 'finished' || s.paused) return { state: s, cues };
  if (action.type === 'tick') {
    s.elapsedMs += Math.max(0, Math.min(Number(action.ms) || 0, 5000));
    if (s.elapsedMs >= s.settings.minutes * 60000) finish('time');
    else if (!s.warned && s.elapsedMs >= (s.settings.minutes - 1) * 60000) { s.warned = true; if (['reviewing', 'serving'].includes(s.phase)) s.warningPending = true; else say('warning'); }
    return { state: s, cues };
  }
  if (action.type === 'advance' || action.type === 'skip') {
    if (action.round !== undefined && action.round !== s.rounds) return { state: s, cues };
    if (action.token !== undefined && action.token !== s.flowId) return { state: s, cues };
    if (action.type === 'advance' && s.phase !== 'serving') return { state: s, cues };
    s.rounds += 1; s.flowId++; s.review = null;
    if (s.mode !== 'free' && s.rounds >= 3) finish('rounds');
    else {
      s.role = s.role === 'rabbit' ? 'bear' : 'rabbit'; s.phase = 'active';
      s.order = makeOrder(s.settings, s.order, rng); s.plate = []; resetCount();
      s.roundFoods = shuffle(FOOD_IDS, rng).slice(0, 3);
      s.stock = makeStock(s.mode, s.order, [], s.roundFoods, s.settings.supply);
      s.attempts = 0; s.reveal = false; s.remaining = sortItems(s.roundFoods, rng);
      s.baskets = emptyBaskets(s.roundFoods); s.selected = null;
      flushWarning(); track(); say(introCue(s));
    }
    return { state: s, cues };
  }
  if (s.phase === 'reviewing') {
    const r = s.review;
    if (action.type === 'reviewBack') {
      s.phase = 'active'; s.review = null; s.flowId++; resetCount(); s.lastCue = ''; flushWarning();
    } else if (action.type === 'reviewManual' || action.type === 'reviewAuto') {
      if (['intro', 'item', 'waiting', 'total'].includes(r.step)) beginReview(action.type === 'reviewManual' ? 'manual' : 'auto');
    } else if (action.type === 'reviewError' && action.token === s.flowId && r.step !== 'waiting') {
      r.error = true;
    } else if (['reviewRetry', 'reviewSilent'].includes(action.type) && r.error) {
      r.error = false; r.silent = action.type === 'reviewSilent'; s.flowId++; say(s.lastCue);
    } else if (action.type === 'count' && r.mode === 'manual' && r.step === 'waiting' && !r.error) {
      if (s.plate.some(p => p.id === action.id) && !s.counted.includes(action.id)) {
        s.counted.push(action.id); reviewStep('item', `count-${s.counted.length}`);
      }
    } else if (action.type === 'reviewDone' && action.token === s.flowId && !r.error) {
      if (r.step === 'intro' || r.step === 'item') {
        if (s.counted.length === s.plate.length) reviewStep('total', totalCue(s.plate));
        else if (r.mode === 'auto') nextItem();
        else { reviewStep('waiting'); s.lastCue = ''; }
      } else if (r.step === 'total') {
        const verdict = judgeOrder(s.plate, s.order);
        if (verdict === 'correct') reviewStep('thanks', 'thanks');
        else { s.attempts++; s.reveal = s.attempts >= 2; if (s.reveal) s.hintsUsed = true; reviewStep('target', introCue(s)); }
      } else if (r.step === 'target') {
        const verdict = judgeOrder(s.plate, s.order);
        reviewStep('feedback', verdict === 'less' ? (s.order.count - s.plate.length === 1 ? 'addOne' : 'addSome') : verdict === 'more' ? 'takeSomeBack' : verdict);
      } else if (r.step === 'feedback') {
        s.phase = 'active'; s.review = null; s.flowId++; resetCount(); flushWarning();
      } else if (r.step === 'thanks') {
        s.phase = 'serving'; s.review = null; s.flowId++; resetCount();
      }
    }
    return { state: s, cues };
  }
  if (s.phase !== 'active') return { state: s, cues };
  track();
  switch (action.type) {
    case 'intro': say(introCue(s)); break;
    case 'add':
      if (!s.counting && s.mode !== 'sort' && FOOD_IDS.includes(action.food)) {
        const item = potItems(s).find(p => p.food === action.food && (action.id === undefined || p.id === action.id));
        if (!item) break;
        if (s.plate.length >= 5) say('full');
        else { s.plate.push(item); resetCount(); s.lastCue = ''; }
      }
      break;
    case 'remove':
      if (!s.counting) { s.plate = s.plate.filter(p => p.id !== action.id); resetCount(); s.lastCue = ''; }
      break;
    case 'countStart':
      if (!s.plate.length) say('empty');
      else { s.counting = true; s.counted = []; s.hintsUsed = true; say('countHelp'); }
      break;
    case 'countExit': resetCount(); s.lastCue = ''; break;
    case 'count':
      if (s.counting && s.plate.some(p => p.id === action.id) && !s.counted.includes(action.id)) {
        s.counted.push(action.id); say(`count-${s.counted.length}`);
        if (s.counted.length === s.plate.length) say(totalCue(s.plate));
      }
      break;
    case 'submit': {
      if (s.counting) break;
      if (s.mode === 'order' && s.plate.length) { beginReview('auto'); break; }
      const verdict = s.mode === 'free' ? (s.plate.length ? 'correct' : 'empty') : judgeOrder(s.plate, s.order);
      if (verdict === 'correct') { s.phase = 'serving'; say(s.mode === 'free' ? 'freeThanks' : totalCue(s.plate)); if (s.mode === 'order') say('thanks'); }
      else { s.attempts++; s.reveal = s.attempts >= 2; if (s.reveal) s.hintsUsed = true; say(s.plate.length ? verdict : 'empty'); }
      break;
    }
    case 'select':
      if (s.mode === 'sort' && s.remaining.some(p => p.id === action.id)) s.selected = action.id;
      break;
    case 'sort': {
      if (s.mode !== 'sort' || !s.roundFoods.includes(action.food)) break;
      const item = s.remaining.find(p => p.id === (action.id || s.selected));
      if (!item) break;
      s.selected = null;
      if (item.food !== action.food) say('sortWrong');
      else {
        s.remaining = s.remaining.filter(p => p.id !== item.id); s.baskets[action.food].push(item); s.lastCue = '';
        if (!s.remaining.length) { s.phase = 'serving'; say('sortThanks'); }
      }
      break;
    }
  }
  return { state: s, cues };
}
export function sessionSummary(s) {
  return { mode: s.mode, seconds: Math.round(s.elapsedMs / 1000), quantities: s.quantitiesSeen, hintsUsed: s.hintsUsed, date: new Date().toISOString() };
}
export function restoreSession(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw);
    if (!s || ![1, 2].includes(s.version) || !['active', 'reviewing', 'serving', 'finished'].includes(s.phase)) return null;
    const legacy = s.version === 1;
    if (legacy) {
      if (s.phase === 'reviewing') return null;
      s.settings = { ...s.settings, supply: 'exact' }; s.flowId = 0; s.review = null; s.warningPending = false; s.version = 2;
    }
    if (!Number.isSafeInteger(s.flowId) || s.flowId < 0 || typeof s.warningPending !== 'boolean') return null;
    if (s.phase === 'reviewing') {
      const r = s.review;
      if (s.mode !== 'order' || !r || !['auto', 'manual'].includes(r.mode) || !['intro', 'item', 'waiting', 'total', 'target', 'feedback', 'thanks'].includes(r.step) || typeof r.error !== 'boolean' || typeof r.silent !== 'boolean') return null;
      if (s.counting || !s.plate?.length || (r.step === 'waiting' && r.mode !== 'manual')) return null;
      if (r.step !== 'waiting' && !LINES[s.lastCue]) return null;
    } else if (s.review !== null) return null;
    if (!['order', 'sort', 'free'].includes(s.mode) || !['rabbit', 'bear'].includes(s.role)) return null;
    // 替换食材时保留实物身份、计数标记和装盘位置，旧录音不迁移到新台词。
    const replaceFood = food => food === 'wing' ? 'ribs' : food;
    if (s.order) s.order.food = replaceFood(s.order.food);
    for (const key of ['plate', 'remaining', 'stock']) {
      if (Array.isArray(s[key])) s[key] = s[key].map(p => ({ ...p, food: replaceFood(p.food) }));
    }
    if (Array.isArray(s.roundFoods)) s.roundFoods = s.roundFoods.map(replaceFood);
    if (s.baskets && typeof s.baskets === 'object') {
      s.baskets = Object.fromEntries(Object.entries(s.baskets).map(([food, items]) => [replaceFood(food), Array.isArray(items) ? items.map(p => ({ ...p, food: replaceFood(p.food) })) : items]));
    }
    if (typeof s.lastCue === 'string') s.lastCue = s.lastCue.replace('-wing', '-ribs');
    if (!FOOD_IDS.includes(s.order?.food) || ![1, 2, 3, 4, 5].includes(s.order.count)) return null;
    const validItems = a => Array.isArray(a) && a.every(p => typeof p.id === 'string' && FOOD_IDS.includes(p.food)) && new Set(a.map(p => p.id)).size === a.length;
    if (!validItems(s.plate) || s.plate.length > 5 || !validItems(s.remaining) || s.remaining.length > 6) return null;
    // 旧存档沿用原有三种食材，不在恢复过程中改变已摆放的食物。
    if (!s.roundFoods) s.roundFoods = ['dumpling', 'shrimp', 'ribs'];
    if (!Array.isArray(s.roundFoods) || s.roundFoods.length !== 3 || new Set(s.roundFoods).size !== 3 || !s.roundFoods.every(f => FOOD_IDS.includes(f))) return null;
    if (!s.baskets || !s.roundFoods.every(f => validItems(s.baskets[f]) && s.baskets[f].every(p => p.food === f))) return null;
    if (!s.remaining.every(p => s.roundFoods.includes(p.food))) return null;
    if (!Array.isArray(s.counted) || !s.counted.every(id => s.plate.some(p => p.id === id)) || new Set(s.counted).size !== s.counted.length) return null;
    if (!Number.isFinite(s.elapsedMs) || s.elapsedMs < 0 || !Number.isInteger(s.rounds) || s.rounds < 0 || !Number.isInteger(s.nextId)) return null;
    if (!Array.isArray(s.quantitiesSeen) || !s.quantitiesSeen.every(n => [1, 2, 3, 4, 5].includes(n))) return null;
    if (typeof s.lastCue !== 'string' || typeof s.startedAt !== 'string' || !Number.isFinite(s.attempts)) return null;
    if (typeof s.counting !== 'boolean' || typeof s.hintsUsed !== 'boolean' || typeof s.reveal !== 'boolean') return null;
    // 升级旧会话时保留已装盘的食物，只补足订单中尚未取出的份数。
    if (!s.stock && legacy) s.stock = makeStock(s.mode, s.order, s.plate, s.roundFoods);
    if (!validItems(s.stock) || s.stock.length > 10 || !s.plate.every(p => s.stock.some(item => item.id === p.id && item.food === p.food))) return null;
    s.settings = normalizeSettings(s.settings);
    if (s.settings.mode !== s.mode) return null;
    if (s.mode === 'order' && (s.stock.length !== s.order.count + (s.settings.supply === 'extra' ? 1 : 0) || !s.stock.every(p => p.food === s.order.food) || !quantities(s.settings).includes(s.order.count))) return null;
    if (s.phase === 'reviewing') {
      const step = s.review.step;
      if (step === 'intro' && s.counted.length || step === 'item' && !s.counted.length || step === 'waiting' && s.counted.length >= s.plate.length) return null;
      if (['total', 'target', 'feedback', 'thanks'].includes(step) && s.counted.length !== s.plate.length) return null;
      if (step === 'thanks' && judgeOrder(s.plate, s.order) !== 'correct') return null;
      const expectedCue = { intro: s.review.mode === 'manual' ? 'countHelp' : 'reviewIntro', item: `count-${s.counted.length}`, total: totalCue(s.plate), target: introCue(s), thanks: 'thanks', waiting: '' };
      if (Object.hasOwn(expectedCue, step) && s.lastCue !== expectedCue[step]) return null;
      if (step === 'feedback' && !['addOne', 'addSome', 'takeSomeBack', ...FOOD_IDS.map(f => `wrong-${f}`)].includes(s.lastCue)) return null;
    }
    s.flowId++; s.paused = s.phase !== 'finished';
    return s;
  } catch { return null; }
}
