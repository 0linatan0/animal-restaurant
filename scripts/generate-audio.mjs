import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LINES } from '../public/js/catalog.js';

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; p.stderr.on('data', s => err += s);
  p.on('error', reject); p.on('close', code => code ? reject(new Error(`${cmd}: ${err}`)) : resolve());
});
const roles = { rabbit: ['Tingting', '175'], bear: ['Eddy (中文（中国大陆）)', '155'] };
for (const [role, [voice, rate]] of Object.entries(roles)) {
  await mkdir(`public/assets/audio/${role}`, { recursive: true });
  let i = 0;
  for (const line of Object.values(LINES)) {
    const output = `public/assets/audio/${role}/${line.id}.mp3`;
    if ((await stat(output).catch(() => null))?.size > 1000) continue;
    const tmp = join(tmpdir(), `animal-kitchen-${process.pid}-${role}.aiff`);
    await run('say', ['-v', voice, '-r', rate, '-o', tmp, line.text]);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '48k', output]);
    await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', output]);
    if ((await stat(output)).size < 1000) throw new Error(`语音生成失败：${role}/${line.id}，请检查系统语音服务权限。`);
    await rm(tmp, { force: true });
    if (++i % 10 === 0) console.log(`${role}: ${i}/${Object.keys(LINES).length}`);
  }
}
await writeFile('public/assets/audio/provenance.json', JSON.stringify({ source: 'macOS local speech synthesis', roles, generated: new Date().toISOString(), text: LINES }, null, 2));
console.log('默认中文音频生成完成。');
