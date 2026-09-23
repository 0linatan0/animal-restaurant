import { LINES, GROUPS, ROLES, MODE_NAMES, voiceKey } from './catalog.js';
import { normalizeSettings } from './model.js';
import { icon, esc, animalArt } from './art.js';
import { listClips, getClip, writeClips, local } from './storage.js';
import { ClipRecorder, exportVoices, validateVoicePackage, importValidatedVoices } from './audio.js';

export class ParentPanel {
  constructor(dialog, options) { this.dialog = dialog; this.o = options; this.role = 'rabbit'; this.line = 'welcome'; this.tab = 'settings'; this.clips = []; this.group = '入座与结束'; }
  async open() {
    this.formSettings = { ...this.o.getSettings() };
    this.opened = true; this.tab = 'settings'; this.notice = ''; this.draft = null; this.pendingImport = null; this.recordState = ''; this.restoreConfirm = false;
    this.dialog.showModal(); this.render();
    try { this.clips = await listClips(); } catch (e) { this.notice = e.message; }
    if (this.opened && this.tab !== 'settings') this.render();
  }
  close() { this.opened = false; this.recorder?.cancel(); clearInterval(this.recordClock); this.o.player.stop(); this.dialog.close(); this.dialog.innerHTML = ''; this.o.onClose(); }
  render() {
    if (!this.opened) return;
    const tabs = { settings: '怎么玩', voices: '家人配音', offline: '离线与备份' };
    this.dialog.innerHTML = `<div class="parent-shell"><header class="parent-header"><div><span class="small-leaf">${icon('leaf')} 给大人的小角落</span><h2>把餐厅准备好</h2></div><button class="round-button" data-parent="close" aria-label="关闭家长区">${icon('close')}</button></header><nav class="parent-tabs">${Object.entries(tabs).map(([key, name]) => `<button class="${this.tab === key ? 'active' : ''}" data-tab="${key}">${name}</button>`).join('')}</nav><div class="parent-body">${this.tab === 'settings' ? this.settingsView() : this.tab === 'voices' ? this.voiceView() : this.offlineView()}<p class="parent-notice" role="status">${esc(this.notice)}</p></div><footer class="parent-footer">录音和游戏记录只保存在这台设备，不会上传。</footer></div>`;
    this.dialog.onclick = e => { const t = e.target.closest('[data-parent], [data-tab]'); if (!t) return; if (t.dataset.tab) { this.recorder?.cancel(); this.o.player.stop(); this.recordState = ''; this.draft = null; this.notice = ''; this.pendingImport = null; this.tab = t.dataset.tab; this.render(); } else this.action(t.dataset.parent); };
    this.dialog.onchange = e => this.change(e);
    this.dialog.oncancel = e => { e.preventDefault(); this.close(); };
  }
  settingsView() {
    const s = this.formSettings, extra = s.mode === 'order' && s.supply === 'extra', session = this.o.getSession();
    const options = (items, value) => Object.entries(items).map(([k, v]) => `<option value="${k}" ${String(value) === k ? 'selected' : ''}>${v}</option>`).join('');
    const summary = local.get('summary');
    return `<div class="settings-grid"><label>今天玩什么<select id="setting-mode">${options(MODE_NAMES, s.mode)}</select></label>${s.mode === 'order' ? `<label>备菜方式<select id="setting-supply">${options({ exact: '一起装盘 · 正好够吃', extra: '自己拿够 · 多备一份' }, s.supply)}</select></label>` : ''}<label>数量范围<select id="setting-quantity">${options(extra ? { '1-3': '1～3', 1: '只玩1', 2: '只玩2', 3: '只玩3' } : { '1-5': '1～5', '1-3': '1～3', 1: '只玩1', 2: '只玩2', 3: '只玩3', 4: '只玩4', 5: '只玩5' }, s.quantity)}</select></label><label>订单提示<select id="setting-hints" ${extra ? 'disabled' : ''}>${options({ full: '数字＋对应份数图案', simple: '数字＋一个食物图标' }, s.hints)}</select></label><label>每次玩多久<select id="setting-minutes">${options({ 5: '5分钟', 8: '8分钟', 10: '10分钟' }, s.minutes)}</select></label></div><p class="field-help">${extra ? '自己拿够：订单1～3份，锅里多一份，保留完整图案提示。' : ''}设置在下次开局生效。点餐最多接待3位客人；分类最多玩3轮。孩子不需要完成全部数量。</p><div class="parent-actions"><button class="primary small" data-parent="save-settings">保存设置</button><button class="secondary small" data-parent="new">${session ? '按当前设置重新开局' : '准备好，去餐厅'}</button>${session && session.phase !== 'finished' ? '<button class="text-button" data-parent="skip">跳过这份订单 / 这一轮</button><button class="text-button" data-parent="finish">今天先收工</button>' : ''}</div><div class="gentle-note"><h3>一起玩，比答对更重要</h3><p>让孩子自己取放、尝试。她想换一种玩法时，可以跟着她的兴趣走。请有成人在旁陪同。</p></div><section class="summary"><h3>最近一次的小记录</h3>${summary ? `<p>${esc(MODE_NAMES[summary.mode])} · ${Math.max(1, Math.ceil(summary.seconds / 60))}分钟</p><p>接触的数量：${summary.quantities.length ? summary.quantities.join('、') : '本次主要自由探索或分类'}；${summary.hintsUsed ? '使用了数数或辅助提示' : '未使用额外提示'}。</p>` : '<p>还没有游戏记录，先一起做一顿饭吧。</p>'}<p class="field-help">用于了解玩法体验，不评价孩子的能力。</p></section>`;
  }
  voiceView() {
    const key = voiceKey(this.role, this.line), saved = this.clips.some(c => c.key === key);
    const count = this.clips.filter(c => c.key.startsWith(this.role + '/') && Object.hasOwn(LINES, c.key.split('/')[1])).length;
    const busy = ['permission', 'recording', 'processing'].includes(this.recordState);
    return `<div class="voice-heading">${animalArt(this.role, 'voice-animal')}<div><h3>给${ROLES[this.role]}配个声音</h3><p>用平时和孩子说话的语气，扮演这位小客人。</p><p class="field-help">已录 ${count} / ${Object.keys(LINES).length} 句。其他台词使用内置语音。</p></div></div><div class="settings-grid"><label>动物角色<select id="voice-role" ${busy ? 'disabled' : ''}>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${this.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>台词分组<select id="voice-group" ${busy ? 'disabled' : ''}>${GROUPS.map(g => `<option ${g === this.group ? 'selected' : ''}>${g}</option>`).join('')}</select></label></div><label class="line-label">选择一句台词<select id="voice-line" ${busy ? 'disabled' : ''}>${Object.values(LINES).filter(l => l.group === this.group).map(l => `<option value="${l.id}" ${l.id === this.line ? 'selected' : ''}>${this.clips.some(c => c.key === voiceKey(this.role, l.id)) ? '✓ ' : ''}${esc(l.text)}</option>`).join('')}</select></label><div class="script-card"><span>${saved ? '这句已有家人配音' : '这句使用内置语音'}</span><p>“${esc(LINES[this.line].text)}”</p><span id="record-status">${this.recordState === 'recording' ? '正在录制，最长15秒…' : this.recordState === 'permission' ? '请在浏览器提示中允许麦克风…' : this.recordState === 'processing' ? '正在整理录音…' : '一整句录下来，不用拆开。'}</span></div><div class="parent-actions">${busy ? `<button class="primary small" data-parent="stop-record" ${this.recordState !== 'recording' ? 'disabled' : ''}>停止录音</button><button class="secondary small" data-parent="cancel-record">取消</button>` : `<button class="primary small" data-parent="record">${icon('mic')} ${this.draft ? '重新录制' : '录这一句'}</button><button class="secondary small" data-parent="listen">${icon('sound')} 听听现在的声音</button>`}${this.draft && !busy ? '<button class="secondary small" data-parent="preview-draft">试听新录音</button><button class="primary small" data-parent="save-record">保存新录音</button>' : ''}</div>${!busy ? `<div class="parent-actions"><button class="text-button" data-parent="preview-order">试听完整点餐示例</button>${saved ? `<button class="text-button" data-parent="${this.restoreConfirm ? 'confirm-restore' : 'restore'}">${this.restoreConfirm ? '确认删除这句录音，恢复默认' : '恢复这句默认语音'}</button>` : ''}</div>` : ''}`;
  }
  offlineView() {
    const off = this.o.offline;
    return `<section class="offline-card"><div class="offline-symbol">${icon(off.ready ? 'check' : 'download')}</div><div><h3>${esc(off.message)}</h3><p>资源准备完整后，关掉网络也可以招待小动物。</p></div></section><div class="parent-actions"><button class="secondary small" data-parent="retry-offline">重新准备资源</button>${off.update ? '<button class="primary small" data-parent="update">安装新版本</button>' : ''}</div><h3>放到平板桌面</h3><p>iPad：在 Safari 的分享菜单里选择“添加到主屏幕”。Android：在 Chrome 菜单里选择“安装应用”或“添加到主屏幕”。</p><p class="field-help">添加后从桌面图标打开，在这个入口完成资源准备和录音。首次准备需要联网；不建议使用应用内嵌浏览器。</p><h3>把家人的声音留一份</h3><p>已保存 ${this.clips.length} 句家人录音。导出后可备份，也能导入另一台平板。</p><div class="parent-actions"><button class="primary small" data-parent="export">${icon('download')} 导出语音包</button><label class="secondary small file-button">导入语音包<input type="file" id="voice-import" accept="application/json,.json" hidden></label></div>${this.pendingImport ? `<div class="gentle-note"><p>已验证 ${this.pendingImport.length} 条录音。导入会替换同角色、同台词的现有录音，其他录音保留。</p><button class="primary small" data-parent="confirm-import">确认导入</button><button class="text-button" data-parent="cancel-import">取消</button></div>` : ''}<p class="field-help">浏览器清理数据可能移除录音，请保存一份备份。录音不会自动同步到其他设备。</p>`;
  }
  readSettings() { return { supply: this.dialog.querySelector('#setting-supply')?.value || this.formSettings.supply, mode: this.dialog.querySelector('#setting-mode')?.value, quantity: this.dialog.querySelector('#setting-quantity')?.value, hints: this.dialog.querySelector('#setting-hints')?.value, minutes: Number(this.dialog.querySelector('#setting-minutes')?.value) }; }
  async action(action) {
    try {
      if (action === 'close') return this.close();
      if (action === 'save-settings' || action === 'new') {
        this.o.setSettings(this.readSettings());
        if (action === 'new') { if (!this.o.offline.ready) { this.notice = '请先在“离线与备份”里完成资源准备。'; this.render(); return; } await this.o.player.unlock(); this.close(); this.o.onNew(); return; }
        this.notice = '已保存，下次开局使用这些设置。';
      }
      if (action === 'skip' || action === 'finish') { this.close(); this.o.onSessionAction(action); return; }
      if (action === 'record') {
        this.o.player.stop(); await this.o.player.unlock(); if (!this.opened || this.tab !== 'voices') return; this.draft = null;
        this.recorder = new ClipRecorder(this.o.player.context, (blob, error) => { if (!this.opened) return; clearInterval(this.recordClock); this.draft = blob; this.recordState = ''; this.notice = error ? error.message : '录好了，可以先试听，满意后保存。'; this.render(); }, state => { if (!this.opened) return; this.recordState = state; this.render(); if (state === 'recording') { const start = Date.now(); this.recordClock = setInterval(() => { const el = this.dialog.querySelector('#record-status'); if (el) el.textContent = `正在录制 ${Math.min(15, Math.floor((Date.now() - start) / 1000))} / 15 秒`; }, 250); } });
        await this.recorder.start(); return;
      }
      if (action === 'stop-record') { this.recorder?.stop(); return; }
      if (action === 'cancel-record') { this.recorder?.cancel(); clearInterval(this.recordClock); this.recordState = ''; this.notice = '已取消录音。'; }
      if (action === 'preview-draft') { await this.o.player.preview(this.draft); return; }
      if (action === 'listen') { await this.o.player.unlock(); await this.o.player.play(this.role, [this.line]); return; }
      if (action === 'preview-order') { await this.o.player.unlock(); await this.o.player.play(this.role, ['welcome', 'order-dumpling-2', 'count-1', 'count-2', 'total-dumpling-2', 'thanks']); return; }
      if (action === 'save-record' && this.draft) { await writeClips([{ key: voiceKey(this.role, this.line), blob: this.draft, updatedAt: new Date().toISOString() }]); this.draft = null; this.clips = await listClips(); this.notice = '已保存，游戏会使用这句家人的声音。'; }
      if (action === 'restore') this.restoreConfirm = true;
      if (action === 'confirm-restore') { this.o.player.stop(); await writeClips([], [voiceKey(this.role, this.line)]); this.clips = await listClips(); this.restoreConfirm = false; this.notice = '这句已恢复内置语音。'; }
      if (action === 'export') {
        if (!this.clips.length) { this.notice = '还没有家人录音。先到“家人配音”录一句吧。'; }
        else { const blob = await exportVoices(), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `小动物餐厅-家人语音-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); this.notice = '已生成语音包，请在下载文件中保存备份。'; }
      }
      if (action === 'confirm-import' && this.pendingImport) { await importValidatedVoices(this.pendingImport); this.clips = await listClips(); this.pendingImport = null; this.notice = '语音包已导入，可以试听了。'; }
      if (action === 'cancel-import') this.pendingImport = null;
      if (action === 'retry-offline') { await this.o.offline.retry(); }
      if (action === 'update') { this.recorder?.cancel(); this.o.offline.applyUpdate(); return; }
    } catch (e) { this.recordState = ''; this.notice = e.name === 'NotAllowedError' ? '麦克风未获授权，仍可使用默认语音。需要录音时，请在浏览器设置中允许麦克风。' : e.message; }
    this.render();
  }
  async change(e) {
    const id = e.target.id;
    if (id.startsWith('setting-')) { const raw = this.readSettings(); this.formSettings = normalizeSettings(raw); if (this.formSettings.quantity !== raw.quantity) this.notice = '自己拿够使用1～3份，数量范围已调整；订单始终保留完整图案提示。'; this.render(); return; }
    if (id.startsWith('voice-') && id !== 'voice-import') {
      this.o.player.stop(); this.draft = null; this.restoreConfirm = false; this.notice = '';
      if (id === 'voice-role') this.role = e.target.value;
      if (id === 'voice-group') { this.group = e.target.value; this.line = Object.values(LINES).find(l => l.group === this.group).id; }
      if (id === 'voice-line') this.line = e.target.value;
      this.render();
    }
    if (id === 'voice-import' && e.target.files[0]) {
      const file = e.target.files[0]; this.notice = '正在检查每一条录音…'; this.pendingImport = null; this.render();
      try { await this.o.player.unlock(); const clips = await validateVoicePackage(file, this.o.player.context); if (!this.opened || this.tab !== 'offline') return; this.pendingImport = clips.length ? clips : null; this.notice = clips.length ? '检查完成，请确认是否导入。' : '这个语音包里没有家人录音。'; }
      catch (error) { this.notice = `未导入：${error.message}`; }
      this.render();
    }
  }
}
