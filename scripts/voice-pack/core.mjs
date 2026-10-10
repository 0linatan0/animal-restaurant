import { createHash } from 'node:crypto';
import { LINES, ROLES } from '../../public/js/catalog.js';

export const SAMPLE_IDS = ['welcome', 'count-1', 'count-2', 'count-3', 'count-4', 'count-5',
  'order-dumpling-2', 'order-shrimp-3', 'order-ribs-1', 'order-broccoli-4',
  'order-greens-2', 'order-mushroom-5', 'order-bun-3', 'reviewIntro', 'goodbye'];
export const SAMPLE_RATE = 24000;
export const hash = value => createHash('sha256').update(value).digest('hex');

export function selectLines(role, ids) {
  if (!Object.hasOwn(ROLES, role)) throw new Error('角色必须为 rabbit（小兔子）或 bear（小熊）。');
  const selected = ids ?? Object.keys(LINES);
  if (!selected.length || new Set(selected).size !== selected.length || selected.some(id => !Object.hasOwn(LINES, id))) {
    throw new Error('台词 ID 为空、重复或不在当前游戏目录中。');
  }
  return selected.map(id => LINES[id]);
}

export function resolveProfile(config, name, env = process.env, { requireSpeaker = true } = {}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/.test(name) || !Object.hasOwn(config.profiles ?? {}, name)) {
    throw new Error('profile 名称无效或不存在。');
  }
  const p = config.profiles[name];
  const allowed = ['speakerEnv', 'apiKeyEnv', 'appIdEnv', 'accessTokenEnv', 'model', 'speechRate'];
  if (!p || typeof p !== 'object' || Object.keys(p).some(k => !allowed.includes(k))) throw new Error('音色配置包含未知字段；密钥和音色 ID 应放在环境变量中。');
  for (const field of allowed.filter(k => k.endsWith('Env'))) {
    if (p[field] !== undefined && (typeof p[field] !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(p[field]))) throw new Error('配置中的环境变量名称无效。');
  }
  if (!p.speakerEnv) throw new Error('profile 缺少 speakerEnv。');
  const model = p.model ?? 'seed-tts-2.0-standard', speechRate = p.speechRate ?? 0;
  if (!['seed-tts-2.0-standard', 'seed-tts-2.0-expressive'].includes(model) || !Number.isInteger(speechRate) || speechRate < -50 || speechRate > 100) {
    throw new Error('模型或语速无效：语速必须为 -50～100 的整数。');
  }
  const speaker = env[p.speakerEnv]?.trim();
  if (requireSpeaker && !speaker) throw new Error(`请在本机环境配置 ${p.speakerEnv}，不要把音色或凭据提交到 Git。`);
  return { name, speaker, model, speechRate, apiKey: env[p.apiKeyEnv ?? 'VOLC_API_KEY']?.trim(),
    appId: env[p.appIdEnv ?? 'VOLC_APP_ID']?.trim(), accessToken: env[p.accessTokenEnv ?? 'VOLC_ACCESS_TOKEN']?.trim() };
}

export function requestFingerprint(profile, line) {
  // 不把音色 ID 写入文件；角色不参与摘要，同一音色可以复用于不同角色。
  return hash(JSON.stringify({ version: 1, resource: 'seed-icl-2.0', speaker: profile.speaker,
    model: profile.model, speechRate: profile.speechRate, text: line.text, sampleRate: SAMPLE_RATE, format: 'pcm-s16le-mono' }));
}

export function pcmToWav(pcm) {
  if (!Buffer.isBuffer(pcm) || pcm.length % 2 || pcm.length < SAMPLE_RATE * 2 * .15 || pcm.length > SAMPLE_RATE * 2 * 15) {
    throw new Error('音频 PCM 不完整或时长不在 0.15～15 秒范围内，未保存此句。');
  }
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24); wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  inspectWav(wav);
  return wav;
}

export function inspectWav(wav) {
  // 工具只接受自己产生的标准单声道 PCM WAV，不猜测未知头部或声道布局。
  if (!Buffer.isBuffer(wav) || wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 16) !== 'WAVEfmt ' ||
    wav.readUInt32LE(4) !== wav.length - 8 || wav.readUInt32LE(16) !== 16 || wav.readUInt16LE(20) !== 1 || wav.readUInt16LE(22) !== 1 ||
    wav.readUInt32LE(24) !== SAMPLE_RATE || wav.readUInt32LE(28) !== SAMPLE_RATE * 2 || wav.readUInt16LE(32) !== 2 ||
    wav.readUInt16LE(34) !== 16 || wav.toString('ascii', 36, 40) !== 'data' || wav.readUInt32LE(40) !== wav.length - 44 || (wav.length - 44) % 2) {
    throw new Error('不是完整的 24 kHz、16 bit、单声道 PCM WAV。');
  }
  const duration = (wav.length - 44) / (SAMPLE_RATE * 2);
  if (duration < .15 || duration > 15 || wav.toString('base64').length > 1000000) throw new Error('音频时长或大小超出游戏导入限制。');
  if (!wav.subarray(44).some(byte => byte !== 0)) throw new Error('音频只有静音，未保存此句。');
  return { duration, bytes: wav.length };
}

export function makePackage(role, lines, audio) {
  selectLines(role, lines.map(l => l.id));
  const clips = lines.map(line => {
    const wav = audio.get(line.id);
    if (!wav) throw new Error(`缺少台词 ${line.id}，请完成生成后再打包。`);
    inspectWav(wav);
    return { key: `${role}/${line.id}`, mime: 'audio/wav', data: wav.toString('base64') };
  });
  const content = JSON.stringify({ format: 'little-kitchen-voices', version: 1, exportedAt: new Date().toISOString(), clips });
  if (Buffer.byteLength(content) > 80 * 1024 * 1024) throw new Error('语音包超过 80 MiB，请分组打包。');
  return content;
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function reviewHtml(role, lines, audio) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src data:; style-src 'unsafe-inline'">
<title>${escapeHtml(ROLES[role])}配音试听</title><style>body{max-width:760px;margin:32px auto;padding:0 20px;font:18px/1.6 system-ui;background:#faf7ef;color:#26382e}article{border-top:1px solid #ddd;padding:12px 0}audio{width:100%}small{color:#526358}</style>
<h1>${escapeHtml(ROLES[role])}配音试听</h1><p>本地样音 ${audio.size}/${lines.length} 句。请检查数字、量词、食物名称及整句是否完整，声音是否自然。声音仅用于动物角色配音。</p>
${lines.map(line => `<article><small>${escapeHtml(line.group)} · ${escapeHtml(line.id)}</small><p>${escapeHtml(line.text)}</p>${audio.has(line.id) ? `<audio controls preload="none" src="data:audio/wav;base64,${audio.get(line.id).toString('base64')}"></audio>` : '<p>尚未生成</p>'}</article>`).join('\n')}</html>`;
}
