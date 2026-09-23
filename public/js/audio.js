import { LINES, ARCHIVED_LINE_IDS, ROLES, voiceKey, defaultAudio } from './catalog.js';
import { getClip, listClips, writeClips } from './storage.js';

export function pcmWav(samples, sampleRate = 22050) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buffer);
  const text = (offset, s) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); v.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  text(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const x = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true); }
  return new Blob([buffer], { type: 'audio/wav' });
}
export class VoicePlayer {
  constructor(onBlocked = () => {}) {
    this.audio = new Audio(); this.audio.preload = 'auto'; this.epoch = 0; this.tail = Promise.resolve(true); this.onBlocked = onBlocked; this.context = null; this.active = false;
  }
  async unlock() {
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    await this.context.resume();
    if (this.unlocked) return;
    const url = URL.createObjectURL(pcmWav(new Float32Array(2205)));
    try { this.audio.src = url; await this.audio.play(); this.audio.pause(); this.unlocked = true; this.onBlocked(false); }
    finally { URL.revokeObjectURL(url); }
  }
  stop() {
    this.epoch++; this.audio.pause(); this.resolveCurrent?.(false); this.resolveCurrent = null; this.tail = Promise.resolve(true); this.active = false;
  }
  async one(role, line, epoch) {
    let custom;
    try { custom = await getClip(voiceKey(role, line)); } catch {}
    if (epoch !== this.epoch) return false;
    const url = custom ? URL.createObjectURL(custom.blob) : defaultAudio(role, line);
    try { return await this.url(url, epoch); } finally { if (custom) URL.revokeObjectURL(url); }
  }
  url(url, epoch = this.epoch) {
    return new Promise(resolve => {
      if (epoch !== this.epoch) return resolve(false);
      let settled = false;
      const done = ok => { if (settled) return; settled = true; if (this.resolveCurrent === done) { this.resolveCurrent = null; this.active = false; } resolve(ok); };
      this.resolveCurrent = done; this.audio.onended = () => done(true);
      this.audio.onerror = () => { if (epoch !== this.epoch || settled) return; this.onBlocked(true, '声音暂时没有准备好，请请大人检查离线资源。'); done(false); };
      this.audio.src = url; this.active = true;
      this.audio.play().then(() => { if (epoch === this.epoch && !settled) this.onBlocked(false); }).catch(() => { if (epoch !== this.epoch || settled) return; this.onBlocked(true, '点一下，打开声音'); done(false); });
    });
  }
  play(role, lines, replace = true) {
    if (replace) this.stop();
    const epoch = this.epoch;
    const run = async () => { for (const line of lines) { if (!LINES[line] || epoch !== this.epoch || !await this.one(role, line, epoch)) return false; } return true; };
    this.tail = this.tail.then(run, run); return this.tail;
  }
  async preview(blob) { this.stop(); await this.unlock(); const url = URL.createObjectURL(blob); try { return await this.url(url); } finally { URL.revokeObjectURL(url); } }
  pop() {
    if (this.active || !this.context || this.context.state !== 'running') return;
    const o = this.context.createOscillator(), g = this.context.createGain(), now = this.context.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(490, now); o.frequency.exponentialRampToValueAtTime(340, now + .08);
    g.gain.setValueAtTime(.035, now); g.gain.exponentialRampToValueAtTime(.001, now + .09);
    o.connect(g).connect(this.context.destination); o.start(); o.stop(now + .1);
  }
}
export async function toPortableWav(blob, context) {
  const audio = await context.decodeAudioData(await blob.arrayBuffer());
  if (!Number.isFinite(audio.duration) || audio.duration < .15 || audio.duration > 15.6) throw new Error('录音应在0.15～15秒之间，请重新录制。');
  const rate = 22050, out = new Float32Array(Math.min(Math.ceil(audio.duration * rate), rate * 15));
  // 混为单声道并重采样，使用所有目标浏览器可解码的 PCM WAV。
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < out.length; i++) { const x = i * audio.sampleRate / rate, a = Math.floor(x), t = x - a; out[i] += ((data[a] || 0) * (1 - t) + (data[a + 1] || 0) * t) / audio.numberOfChannels; }
  }
  if (out.every(v => Math.abs(v) < .0001)) throw new Error('没有听到声音，请靠近麦克风再试一次。');
  return pcmWav(out, rate);
}
export class ClipRecorder {
  constructor(context, onDone, onState) { this.context = context; this.onDone = onDone; this.onState = onState; this.token = 0; }
  async start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('此浏览器无法录音，请使用 Safari 或 Chrome，或导入语音包。');
    const token = ++this.token; this.cancelled = false; this.onState('permission');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (token !== this.token) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m));
    try { this.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {}); }
    catch (e) { stream.getTracks().forEach(t => t.stop()); throw e; }
    const chunks = [];
    this.recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    this.recorder.onerror = () => { this.cancel(); this.onState('error'); };
    this.recorder.onstop = async () => {
      clearTimeout(this.timer); stream.getTracks().forEach(t => t.stop());
      if (this.cancelled || token !== this.token) return;
      this.onState('processing');
      try { const wav = await toPortableWav(new Blob(chunks, { type: this.recorder.mimeType }), this.context); if (token === this.token) this.onDone(wav); }
      catch (e) { if (token === this.token) this.onDone(null, e); }
    };
    this.recorder.start(); this.onState('recording'); this.timer = setTimeout(() => this.stop(), 15000);
  }
  stop() { clearTimeout(this.timer); if (this.recorder?.state === 'recording') this.recorder.stop(); this.stream?.getTracks().forEach(t => t.stop()); }
  cancel() { this.cancelled = true; this.token++; this.stop(); }
}
const blobBase64 = blob => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.onerror = reject; r.readAsDataURL(blob); });
export async function exportVoices() {
  const clips = await listClips();
  const entries = await Promise.all(clips.map(async c => ({ key: c.key, mime: 'audio/wav', data: await blobBase64(c.blob) })));
  return new Blob([JSON.stringify({ format: 'little-kitchen-voices', version: 1, exportedAt: new Date().toISOString(), clips: entries })], { type: 'application/json' });
}
export async function validateVoicePackage(file, context) {
  if (file.size > 80 * 1024 * 1024) throw new Error('语音包超过80MB，请检查文件。');
  let p; try { p = JSON.parse(await file.text()); } catch { throw new Error('这不是有效的语音包文件。'); }
  if (p.format !== 'little-kitchen-voices' || p.version !== 1 || !Array.isArray(p.clips) || p.clips.length > (Object.keys(LINES).length + ARCHIVED_LINE_IDS.length) * 2) throw new Error('语音包格式或版本不支持。');
  const seen = new Set(), clips = [];
  for (const item of p.clips) {
    if (typeof item.key !== 'string') throw new Error('语音包包含未知台词。');
    const [role, line, extra] = item.key.split('/');
    if (!Object.hasOwn(ROLES, role) || (!Object.hasOwn(LINES, line) && !ARCHIVED_LINE_IDS.includes(line)) || extra || seen.has(item.key) || item.mime !== 'audio/wav' || typeof item.data !== 'string' || item.data.length > 1000000) throw new Error('语音包包含无效或重复录音。');
    seen.add(item.key);
    let bytes; try { bytes = Uint8Array.from(atob(item.data), c => c.charCodeAt(0)); } catch { throw new Error('语音包中的音频数据不完整。'); }
    const head = new TextDecoder().decode(bytes.slice(0, 12));
    if (!head.startsWith('RIFF') || head.slice(8) !== 'WAVE') throw new Error('语音包中的录音不是可移植的 WAV 格式。');
    const decoded = await context.decodeAudioData(bytes.buffer.slice(0)).catch(() => null);
    if (!decoded || decoded.duration < .15 || decoded.duration > 15.1 || decoded.numberOfChannels !== 1) throw new Error('录音损坏、过长或声道格式不支持，已有录音保持不变。');
    clips.push({ key: item.key, blob: new Blob([bytes], { type: 'audio/wav' }), updatedAt: new Date().toISOString() });
  }
  return clips;
}
export const importValidatedVoices = clips => writeClips(clips);
