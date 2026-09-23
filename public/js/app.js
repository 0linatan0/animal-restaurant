import { FOODS, ROLES, LINES, MODE_NAMES } from './catalog.js';
import { createSession, transition, normalizeSettings, introCue, sessionSummary, potItems as availableFood } from './model.js';
import { foodArt, animalArt, plantArt, icon, esc } from './art.js';
import { local, loadSettings, loadSession } from './storage.js';
import { VoicePlayer } from './audio.js';
import { OfflineManager } from './offline.js';
import { ParentPanel } from './parents.js';

const root = document.querySelector('#app'), gate = document.querySelector('#gate-dialog');
const recover = document.querySelector('#audio-recover'), dragLayer = document.querySelector('#drag-layer');
let settings = loadSettings(), session = loadSession(), pointer = null, hold = null, holdId = null, held = false, lastTime = performance.now();
let storageWarning = false, pendingVoice = null;
let flowKey = '', flowEpoch = 0, flowTimer = null;
const player = new VoicePlayer((blocked, message) => { recover.hidden = !blocked; if (blocked) recover.textContent = message; });
const offline = new OfflineManager(() => {
  const el = document.querySelector('#offline-status'); if (el) el.innerHTML = `${icon(offline.ready ? 'check' : 'download')} ${esc(offline.message)}`;
  for (const button of document.querySelectorAll('[data-action="start"], [data-action="resume"]')) button.disabled = !offline.ready;
  if (parents.opened && parents.tab === 'offline') parents.render();
});
const parents = new ParentPanel(document.querySelector('#parent-dialog'), {
  player, offline, getSettings: () => settings, getSession: () => session,
  setSettings: value => { settings = normalizeSettings(value); if (!local.set('settings', settings)) throw new Error('设置未能保存，请检查浏览器存储空间。'); },
  onClose: () => { render(); },
  onNew: () => start(),
  onSessionAction: type => { if (session) { session = transition(session, { type: 'resume' }).state; dispatch({ type: type === 'skip' ? 'skip' : 'finish', round: session.rounds }); } },
});
function save() { if (session && !local.set('session', session)) storageWarning = true; }
function foodButton(food, id, source, extra = '') {
  const locked = session?.phase === 'reviewing' && (source !== 'plate' || session.review.mode !== 'manual' || session.review.step !== 'waiting' || session.review.error);
  return `<button ${locked ? 'disabled' : ''} class="food-button ${extra}" data-food="${food}" ${id ? `data-item="${id}"` : ''} data-source="${source}" aria-label="${source === 'pot' ? `拿一${FOODS[food].unit}` : session?.counting || session?.phase === 'reviewing' ? '数一数' : source === 'sort' ? '选择' : '拿回'}${FOODS[food].name}">${foodArt(food)}</button>`;
}
function header() {
  return `<header class="topbar"><div class="brand">${icon('leaf')}<span>小动物餐厅</span></div><button class="parent-entry" data-action="parent" aria-label="家长区，长按三秒"><span class="hold-progress"></span>${icon('parent')}<span>家长区<small>长按 3 秒</small></span></button></header>`;
}
function awning() { return '<div class="awning" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>'; }
function home() {
  return `${header()}<main class="home"><div class="welcome-copy"><p class="handwritten">小厨师，欢迎回来</p><h1>给小动物<br class="phone-break">做一顿饭吧</h1><p>挑一挑，数一数，把好吃的送给朋友。</p></div><div class="home-scene" aria-hidden="true"><div class="shop-window"><div class="window-cross"></div><div class="sun"></div><div class="hill hill-one"></div><div class="hill hill-two"></div></div><div class="shelf">${plantArt()}<span class="jar"></span></div><div class="home-rabbit">${animalArt('rabbit')}</div><div class="home-bear">${animalArt('bear')}</div><div class="home-table"><div class="table-cloth"></div><div class="hero-pot"><div class="steam steam-one"></div><div class="steam steam-two"></div><div class="hero-foods">${foodArt('bun')}${foodArt('broccoli')}${foodArt('shrimp')}</div></div><div class="little-plate">${foodArt('dumpling')}</div></div><span class="scene-flower flower-one">✿</span><span class="scene-flower flower-two">✿</span></div><div class="home-start"><button class="primary start-button" data-action="start" ${!offline.ready ? 'disabled' : ''}>${icon('play')} 开始玩</button><p>今天玩：${MODE_NAMES[settings.mode]}</p></div><div class="home-footer"><span id="offline-status">${icon(offline.ready ? 'check' : 'download')}${esc(offline.message)}</span><span>和大人一起，慢慢来就好</span></div>${storageWarning ? '<p class="storage-warning">本机存储暂不可用，请大人检查浏览器设置。</p>' : ''}</main>`;
}
function orderCard() {
  const s = session, full = s.settings.hints === 'full' || s.reveal;
  if (s.mode === 'sort') return `<div class="order-bubble"><p>把一样的放在一起</p><div class="order-foods">${s.roundFoods.map(f => foodArt(f)).join('')}</div></div>`;
  if (s.mode === 'free') return `<div class="order-bubble"><p>今天，你来做主！</p><div class="order-foods">${s.roundFoods.map(f => foodArt(f)).join('')}</div></div>`;
  return `<div class="order-bubble ${s.lastCue.startsWith('wrong-') ? 'emphasized' : ''}"><span class="order-label">我想吃</span><div class="order-request"><strong class="order-number">${s.order.count}</strong><div class="order-foods ${full ? '' : 'simple'}">${Array.from({ length: full ? s.order.count : 1 }, () => foodArt(s.order.food)).join('')}</div></div><span class="food-name">${FOODS[s.order.food].fullName}</span></div>`;
}
function gameControls(s) {
  if (s.mode === 'sort') return '<span class="soft-instruction">每种食物都有自己的小盘子</span>';
  if (s.phase === 'serving' && s.mode === 'order') return `<button class="secondary" data-action="advance" data-round="${s.rounds}" data-token="${s.flowId}">${icon('play')} 跳过动画</button>`;
  if (s.phase === 'reviewing') {
    const r = s.review, switching = ['intro', 'item', 'waiting', 'total'].includes(r.step);
    return `${r.error ? `<button class="primary" data-action="reviewRetry">${icon('sound')} 恢复声音</button><button class="secondary" data-action="reviewSilent">${icon('play')} 无声继续</button>` : switching ? r.mode === 'auto' ? `<button class="primary" data-action="reviewManual">${icon('hand')} 我来数</button>` : `<button class="primary help-count" data-action="reviewAuto">${animalArt(s.role)} 帮我数</button>` : ''}<button class="secondary" data-action="reviewBack">${icon('back')} 继续装盘</button>`;
  }
  return s.counting ? `<button class="secondary" data-action="countExit">${icon('back')} 继续装盘</button>` : `<button class="secondary" data-action="countStart" ${s.phase !== 'active' ? 'disabled' : ''}>${icon('count')} 数一数</button><button class="primary serve-button" data-action="submit" ${s.phase !== 'active' ? 'disabled' : ''}>${icon('plate')} ${s.mode === 'free' ? '请客啦' : '上菜啦'}</button>`;
}
function servingScene(s) {
  return `<section class="enjoy-scene" aria-label="${ROLES[s.role]}正在享用你准备的${FOODS[s.order.food].name}"><div class="enjoy-animal">${animalArt(s.role)}<span class="enjoy-note">好香呀，谢谢你！</span></div><div class="enjoy-table"><div class="enjoy-plate">${s.plate.map((p, i) => `<span class="enjoy-food" style="--eat-delay:${.6 + i * .45}s;--eat-x:${((s.plate.length - 1) / 2 - i) * 58}px">${foodArt(p.food)}</span>`).join('')}</div></div></section>`;
}
function game() {
  const s = session, sorting = s.mode === 'sort', reviewing = s.phase === 'reviewing', enjoying = s.phase === 'serving' && s.mode === 'order';
  const potItems = availableFood(s), showTotal = reviewing && ['total', 'target', 'feedback', 'thanks'].includes(s.review.step);
  const basketView = sorting ? `<div class="sorting-plates">${s.roundFoods.map(f => `<button class="sort-plate ${s.selected ? 'can-receive' : ''}" data-action="basket" data-target="${f}" aria-label="${FOODS[f].name}盘子"><div class="basket-mark">${foodArt(f)}</div><div class="sorted-items">${s.baskets[f].map(p => foodArt(p.food)).join('')}</div><span>${FOODS[f].fullName}</span></button>`).join('')}</div>` : `<div class="plate-zone ${showTotal ? 'total-plate' : ''}" data-drop="plate">${showTotal ? `<div class="plate-total">一共 <strong>${s.plate.length}</strong> ${FOODS[s.order.food].unit}${FOODS[s.order.food].name}</div>` : ''}<div class="plate-rim"><div class="plate-content">${s.plate.length ? s.plate.map(p => `<div class="plated-item">${foodButton(p.food, p.id, 'plate', `${s.counted.includes(p.id) ? 'counted' : ''} ${reviewing && s.review.step === 'item' && s.counted.at(-1) === p.id ? 'count-current' : ''}`)}${s.counted.includes(p.id) ? `<span class="count-badge">${s.counted.indexOf(p.id) + 1}</span>` : ''}</div>`).join('') : `<div class="empty-plate">${icon('plate')}<span>把好吃的放进来</span></div>`}</div></div></div>`;
  return `${header()}<main class="kitchen ${sorting ? 'sort-mode' : ''} ${reviewing ? 'review-mode' : ''} ${enjoying ? 'enjoy-mode' : ''}">${awning()}${enjoying ? servingScene(s) : `<section class="guest-area"><div class="guest-character">${animalArt(s.role)}<span class="guest-name">${ROLES[s.role]}</span></div>${orderCard()}<button class="round-button repeat-button" data-action="repeat" ${reviewing ? 'disabled' : ''} aria-label="再听一次订单">${icon('sound')}</button></section><div class="kitchen-message" role="status">${esc(reviewing && s.review.error ? '声音暂时停了，可以恢复声音或无声继续' : s.lastCue && LINES[s.lastCue] ? LINES[s.lastCue].text : s.counting || reviewing ? '点一点，数过的会留下小标记' : sorting ? '先选食物，再选盘子；也可以拖过去' : '点一下食物，或轻轻拖到盘子里')}</div><section class="worktop"><div class="pot-zone" data-drop="pot"><div class="pot-handle handle-left"></div><div class="pot-handle handle-right"></div><div class="pot-rim"><div class="pot-items">${potItems.map(p => foodButton(p.food, p.id, sorting ? 'sort' : 'pot', s.selected === p.id ? 'selected' : '')).join('')}</div></div><span class="pot-label">${sorting ? '一样的，一起放' : s.mode === 'order' && s.settings.supply === 'extra' ? '拿够了，锅里可以留一些' : '热乎乎的小厨房'}</span></div>${basketView}</section>`}<div class="game-controls">${gameControls(s)}<button class="pause-button" data-action="pause" aria-label="暂停">${icon('pause')}</button></div>${s.phase === 'serving' && !enjoying ? '<div class="serving-caption">谢谢你准备的美味</div>' : ''}${s.paused ? `<div class="pause-overlay"><div class="pause-card">${icon('leaf')}<h2>小厨房歇一会儿</h2><p>准备好了，我们再继续。</p><button class="primary" data-action="resume" ${!offline.ready ? 'disabled' : ''}>${icon('play')} 继续玩</button></div></div>` : ''}</main>`;
}
function end() {
  return `${header()}<main class="end-page"><div class="closed-sign">今日收工</div><h1>谢谢你，小厨师</h1><p>今天先做到这里，厨房也要休息啦。</p><div class="farewell-animals">${animalArt('rabbit', '', true)}${animalArt('bear', '', true)}</div>${session.plate.length ? `<div class="saved-plate"><span>${session.finishedReason === 'time' || session.finishedReason === 'parent' ? '这盘先留在这里' : '今天的小小作品'}</span><div>${session.plate.map(p => foodArt(p.food)).join('')}</div></div>` : ''}<p class="end-suggestion">现在，去和身边的人抱一抱吧。</p><span class="end-parent-note">想再开张，请大人长按右上角「家长区」</span></main>`;
}
function render() { root.innerHTML = session ? session.phase === 'finished' ? end() : game() : home(); }
async function playCues(cues, append = false) {
  if (!cues.length) return true;
  const job = { role: session.role, cues, round: session.rounds, startedAt: session.startedAt };
  pendingVoice = job;
  const ok = await player.play(job.role, cues, !append);
  if (ok && pendingVoice === job) pendingVoice = null;
  return ok;
}
function stopFlow() {
  flowEpoch++; clearTimeout(flowTimer); flowTimer = null; flowKey = '';
  player.stop(); pendingVoice = null; recover.hidden = true;
}
function syncFlow() {
  const s = session;
  const running = s && !s.paused && (s.phase === 'reviewing' || s.phase === 'serving' && s.mode === 'order');
  if (!running) { if (flowKey) stopFlow(); return; }
  const key = `${s.startedAt}:${s.flowId}:${s.phase}:${s.review?.error}`;
  if (flowKey === key) return;
  stopFlow(); flowKey = key;
  const epoch = flowEpoch, token = s.flowId, round = s.rounds;
  const complete = () => { if (epoch === flowEpoch) dispatch(s.phase === 'reviewing' ? { type: 'reviewDone', token } : { type: 'advance', round, token }); };
  if (s.phase === 'serving') { flowTimer = setTimeout(complete, 3600); return; }
  if (s.review.error || s.review.step === 'waiting') return;
  if (s.review.silent) { flowTimer = setTimeout(complete, s.review.step === 'item' ? 850 : 1300); return; }
  player.play(s.role, [s.lastCue]).then(ok => {
    if (epoch !== flowEpoch) return;
    if (ok) complete();
    else dispatch({ type: 'reviewError', token });
  });
}
async function dispatch(action) {
  if (!session) return;
  const oldPhase = session.phase;
  const result = transition(session, action); session = result.state; save();
  if (session.phase === 'finished' && oldPhase !== 'finished') local.set('summary', sessionSummary(session));
  if (action.type !== 'tick' || result.cues.length || oldPhase !== session.phase) render();
  syncFlow();
  if (session.phase === 'reviewing' || session.phase === 'serving' && session.mode === 'order') return;
  if (['add', 'remove', 'sort'].includes(action.type)) player.pop();
  const phase = session.phase, startedAt = session.startedAt, round = session.rounds;
  const ok = await playCues(result.cues, action.type === 'count' || (action.type === 'tick' && phase !== 'finished'));
  if (phase === 'serving' && oldPhase !== 'serving' && ok && session.startedAt === startedAt && session.phase === 'serving' && !session.paused) dispatch({ type: 'advance', round });
}
async function start() {
  if (!offline.ready) return;
  stopFlow();
  try { await player.unlock(); } catch { recover.hidden = false; }
  session = createSession(settings); lastTime = performance.now(); save(); render(); dispatch({ type: 'intro' });
}
async function resume() {
  if (!offline.ready) return;
  try { await player.unlock(); } catch {}
  const result = transition(session, { type: 'resume' }); session = result.state;
  lastTime = performance.now(); save(); render(); syncFlow();
  if (session.phase === 'reviewing' || session.phase === 'serving' && session.mode === 'order') return;
  if (session.phase === 'serving') await dispatch({ type: 'advance', round: session.rounds });
  else if (session.counting) await playCues(['countHelp']);
  else await playCues([introCue(session)]);
}
function pause() { stopFlow(); if (session && session.phase !== 'finished') { session = transition(session, { type: 'pause' }).state; save(); render(); } }
function openGate() {
  pause();
  gate.innerHTML = `<div class="gate-content">${icon('parent')}<h2>这里交给大人</h2><p>准备配音、调整玩法，或结束今天的游戏。</p><button class="primary small" id="gate-confirm">我是家长，进入设置</button><button class="text-button" id="gate-cancel">回到餐厅</button></div>`;
  gate.showModal();
  gate.querySelector('#gate-confirm').onclick = () => { gate.close(); parents.open(); };
  gate.querySelector('#gate-cancel').onclick = () => gate.close();
}
root.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]');
  if (!b) {
    const food = e.target.closest('[data-food]');
    if (food && e.detail === 0) foodTap(food.dataset);
    return;
  }
  const action = b.dataset.action;
  if (action === 'parent') { if (e.detail === 0) openGate(); else if (!held) { const label = b.querySelector('small'); if (label) label.textContent = '按住，等小圈填满'; } return; }
  if (action === 'start') return start();
  if (action === 'pause') return pause();
  if (action === 'resume') return resume();
  if (!session || session.paused) return;
  if (action === 'repeat') { if (session.phase === 'active') return playCues([introCue(session)]); return; }
  if (action === 'reviewRetry') { const token = session.flowId, startedAt = session.startedAt; try { await player.unlock(); } catch {} if (!session || session.paused || session.flowId !== token || session.startedAt !== startedAt) return; }
  if (action === 'advance') return dispatch({ type: 'advance', round: Number(b.dataset.round), token: Number(b.dataset.token) });
  if (action === 'basket') return dispatch({ type: 'sort', food: b.dataset.target });
  dispatch({ type: action });
});
function foodTap(data) {
  if (!session || session.paused || !['active', 'reviewing'].includes(session.phase)) return;
  if (data.source === 'pot') dispatch({ type: 'add', food: data.food, id: data.item });
  if (data.source === 'sort') dispatch({ type: 'select', id: data.item });
  if (data.source === 'plate') dispatch({ type: session.counting || session.phase === 'reviewing' ? 'count' : 'remove', id: data.item });
}
root.addEventListener('pointerdown', e => {
  const parent = e.target.closest('[data-action="parent"]');
  if (parent) {
    if (holdId !== null) return; holdId = e.pointerId; held = false; parent.classList.add('holding');
    hold = setTimeout(() => { held = true; holdId = null; parent.classList.remove('holding'); openGate(); }, 3000);
    parent.setPointerCapture(e.pointerId); return;
  }
  const food = e.target.closest('[data-food]');
  if (!food || !session || session.paused || !['active', 'reviewing'].includes(session.phase)) return;
  e.preventDefault(); if (pointer) return;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, data: { ...food.dataset }, dragging: false };
  root.setPointerCapture(e.pointerId);
});
root.addEventListener('pointermove', e => {
  if (!pointer || pointer.id !== e.pointerId || (session?.counting || session?.phase === 'reviewing')) return;
  if (!pointer.dragging && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 12) { pointer.dragging = true; dragLayer.innerHTML = foodArt(pointer.data.food); dragLayer.classList.add('visible'); }
  if (pointer.dragging) dragLayer.style.transform = `translate(${e.clientX - 48}px, ${e.clientY - 45}px)`;
});
function inRect(x, y, element, padding = 16) {
  if (!element) return false; const r = element.getBoundingClientRect();
  return x >= r.left - padding && x <= r.right + padding && y >= r.top - padding && y <= r.bottom + padding;
}
function pointerEnd(e) {
  if (holdId === e.pointerId) { clearTimeout(hold); holdId = null; root.querySelector('.holding')?.classList.remove('holding'); }
  if (!pointer || pointer.id !== e.pointerId) return;
  const p = pointer; pointer = null; dragLayer.classList.remove('visible'); dragLayer.innerHTML = '';
  if (e.type === 'pointercancel') return;
  if (!p.dragging) return foodTap(p.data);
  if (p.data.source === 'pot' && inRect(e.clientX, e.clientY, root.querySelector('[data-drop="plate"]'))) dispatch({ type: 'add', food: p.data.food, id: p.data.item });
  if (p.data.source === 'plate' && inRect(e.clientX, e.clientY, root.querySelector('[data-drop="pot"]'))) dispatch({ type: 'remove', id: p.data.item });
  if (p.data.source === 'sort') {
    const target = [...root.querySelectorAll('[data-target]')].find(el => inRect(e.clientX, e.clientY, el, 8));
    if (target) dispatch({ type: 'sort', id: p.data.item, food: target.dataset.target });
  }
}
root.addEventListener('pointerup', pointerEnd); root.addEventListener('pointercancel', pointerEnd);
root.addEventListener('contextmenu', e => { if (e.target.closest('[data-food], [data-action="parent"]')) e.preventDefault(); });
recover.onclick = async () => {
  try {
    await player.unlock();
    const job = pendingVoice; if (!job) { recover.hidden = true; return; }
    const ok = await player.play(job.role, job.cues);
    if (ok && pendingVoice === job) { pendingVoice = null; recover.hidden = true; if (session?.phase === 'serving' && !session.paused && session.startedAt === job.startedAt) dispatch({ type: 'advance', round: job.round }); }
  } catch { recover.textContent = '请大人检查设备音量与浏览器声音设置'; }
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearTimeout(hold); holdId = null; pointer = null; dragLayer.classList.remove('visible'); parents.recorder?.cancel(); if (parents.opened && parents.recordState) { parents.recordState = ''; parents.notice = '录音因切到后台已取消，请重新录制。'; parents.render(); } pause(); }
  lastTime = performance.now();
});
window.addEventListener('pagehide', () => { parents.recorder?.cancel(); pause(); });
setInterval(() => {
  const now = performance.now(), ms = now - lastTime; lastTime = now;
  if (session && !session.paused && session.phase !== 'finished' && !document.hidden && !parents.opened && !gate.open) dispatch({ type: 'tick', ms });
}, 1000);
render(); offline.start();
