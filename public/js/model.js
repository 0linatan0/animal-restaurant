import { DEFAULT_SETTINGS, FOOD_IDS } from './catalog.js';

export function normalizeSettings(input = {}) {
  return {
    mode: ['order', 'sort', 'free'].includes(input.mode) ? input.mode : DEFAULT_SETTINGS.mode,
    quantity: ['1-3', '1-5', '1', '2', '3', '4', '5'].includes(input.quantity) ? input.quantity : '1-5',
    hints: input.hints === 'simple' ? 'simple' : 'full',
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
function makeStock(mode, order, plate = [], foods = FOOD_IDS.slice(0, 3)) {
  // 每个食物拥有固定身份，取放只改变位置，不凭空复制。
  const stock = [...plate];
  for (const food of mode === 'order' ? [order.food] : foods) {
    const total = mode === 'order' ? (food === order.food ? order.count : 0) : 2;
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
    version: 1, settings: normalized, mode: normalized.mode, role: 'rabbit',
    order, roundFoods, stock: makeStock(normalized.mode, order, [], roundFoods), plate: [], nextId: 1,
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
  const finish = reason => { s.phase = 'finished'; s.finishedReason = reason; s.paused = false; s.counting = false; say('goodbye'); };
  const resetCount = () => { s.counting = false; s.counted = []; };
  const track = () => {
    if (s.mode === 'order' && !s.quantitiesSeen.includes(s.order.count)) s.quantitiesSeen.push(s.order.count);
  };
  if (action.type === 'finish') { if (s.phase !== 'finished') finish('parent'); return { state: s, cues }; }
  if (action.type === 'pause') { s.paused = true; return { state: s, cues }; }
  if (action.type === 'resume') { s.paused = false; return { state: s, cues }; }
  if (s.phase === 'finished' || s.paused) return { state: s, cues };
  if (action.type === 'tick') {
    s.elapsedMs += Math.max(0, Math.min(Number(action.ms) || 0, 5000));
    if (s.elapsedMs >= s.settings.minutes * 60000) finish('time');
    else if (!s.warned && s.elapsedMs >= (s.settings.minutes - 1) * 60000) { s.warned = true; say('warning'); }
    return { state: s, cues };
  }
  if (action.type === 'advance' || action.type === 'skip') {
    if (action.type === 'advance' && s.phase !== 'serving') return { state: s, cues };
    s.rounds += 1;
    if (s.mode !== 'free' && s.rounds >= 3) finish('rounds');
    else {
      s.role = s.role === 'rabbit' ? 'bear' : 'rabbit'; s.phase = 'active';
      s.order = makeOrder(s.settings, s.order, rng); s.plate = []; resetCount();
      s.roundFoods = shuffle(FOOD_IDS, rng).slice(0, 3);
      s.stock = makeStock(s.mode, s.order, [], s.roundFoods);
      s.attempts = 0; s.reveal = false; s.remaining = sortItems(s.roundFoods, rng);
      s.baskets = emptyBaskets(s.roundFoods); s.selected = null;
      track(); say(introCue(s));
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
      const verdict = s.mode === 'free' ? (s.plate.length ? 'correct' : 'empty') : judgeOrder(s.plate, s.order);
      if (verdict === 'correct') { s.phase = 'serving'; say(s.mode === 'free' ? 'freeThanks' : totalCue(s.plate)); if (s.mode === 'order') say('thanks'); }
      else { s.attempts++; s.reveal = s.attempts >= 2; if (s.reveal) s.hintsUsed = true; say(verdict); }
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
    if (!s || s.version !== 1 || !['active', 'serving', 'finished'].includes(s.phase)) return null;
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
    if (!s.stock) s.stock = makeStock(s.mode, s.order, s.plate, s.roundFoods);
    if (!validItems(s.stock) || s.stock.length > 10 || !s.plate.every(p => s.stock.some(item => item.id === p.id && item.food === p.food))) return null;
    s.settings = normalizeSettings(s.settings); s.paused = s.phase !== 'finished';
    return s;
  } catch { return null; }
}
