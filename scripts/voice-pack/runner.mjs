import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hash, requestFingerprint, inspectWav, makePackage, reviewHtml } from './core.mjs';
import { synthesize } from './volcengine.mjs';

export async function atomicWrite(path, data) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, data, { mode: 0o600, flag: 'wx' }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}

export async function cachedAudio(directory, profile, line) {
  const fingerprint = requestFingerprint(profile, line), base = join(directory, 'cache', fingerprint);
  try {
    const [wav, metadata] = await Promise.all([readFile(`${base}.wav`), readFile(`${base}.json`, 'utf8')]);
    const record = JSON.parse(metadata);
    if (record.fingerprint !== fingerprint || record.sha256 !== hash(wav)) return null;
    inspectWav(wav);
    return wav;
  } catch (error) {
    if (error.code && error.code !== 'ENOENT') throw error;
    return null;
  }
}

export async function collectAudio(directory, profile, lines) {
  const audio = new Map();
  for (const line of lines) {
    const wav = await cachedAudio(directory, profile, line);
    if (wav) audio.set(line.id, wav);
  }
  return audio;
}

export async function generate({ directory, profile, role, lines, force = false, synth = synthesize, log = console.log }) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // 同一 profile 的两个任务不能同时覆盖缓存或试听页；不同 profile 彼此独立。
  const lock = join(directory, '.generating');
  try { await mkdir(lock); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('此音色已有生成任务，或上次被强制中断；确认没有任务运行后删除 .generating 目录。'); throw error; }
  let generated = 0, reused = 0;
  try {
    for (const [i, line] of lines.entries()) {
      if (!force && await cachedAudio(directory, profile, line)) { reused++; log(`[${i + 1}/${lines.length}] 复用 ${role}/${line.id}`); continue; }
      log(`[${i + 1}/${lines.length}] 生成 ${role}/${line.id}`);
      const wav = await synth(profile, line);
      const { duration } = inspectWav(wav), fingerprint = requestFingerprint(profile, line), base = join(directory, 'cache', fingerprint);
      // WAV 和元数据分别原子替换，读取时必须同时通过摘要校验才允许复用。
      await atomicWrite(`${base}.wav`, wav);
      await atomicWrite(`${base}.json`, JSON.stringify({ fingerprint, sha256: hash(wav), duration, createdAt: new Date().toISOString() }));
      generated++;
    }
  } finally {
    try {
      const audio = await collectAudio(directory, profile, lines);
      await atomicWrite(join(directory, `review-${role}.html`), reviewHtml(role, lines, audio));
    } finally { await rm(lock, { recursive: true, force: true }); }
  }
  return { generated, reused, review: join(directory, `review-${role}.html`) };
}

export async function pack({ directory, profile, role, lines, reviewed = false, partial = false }) {
  if (!reviewed) throw new Error('请先打开试听页检查所选台词，确认后通过 --reviewed 打包。');
  const audio = await collectAudio(directory, profile, lines);
  const content = makePackage(role, lines, audio);
  const digest = hash(content).slice(0, 12);
  const output = join(directory, `${role}-${partial ? 'partial' : 'complete'}-${digest}.voice-pack.json`);
  await atomicWrite(output, content);
  return { output, clips: lines.length, bytes: Buffer.byteLength(content) };
}
