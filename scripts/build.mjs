import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { LINES, ROLES } from '../public/js/catalog.js';
const root = new URL('../public/', import.meta.url);
for (const role of Object.keys(ROLES)) for (const line of Object.keys(LINES)) {
  const file = new URL(`assets/audio/${role}/${line}.mp3`, root);
  if (!((await stat(file).catch(() => null))?.size > 1000)) throw new Error(`缺少有效默认音频 ${role}/${line}，请先运行 npm run audio。`);
}
for (const size of [192, 512]) if (!await stat(new URL(`assets/icon-${size}.png`, root)).catch(() => null)) throw new Error('缺少PWA图标。');
async function walk(dir, prefix = '') {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['sw.js', 'asset-manifest.json'].includes(e.name)) continue;
    if (e.isDirectory()) files.push(...await walk(new URL(e.name + '/', dir), prefix + e.name + '/'));
    else files.push(prefix + e.name);
  }
  return files;
}
const files = (await walk(root)).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(new URL(f, root)));
const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8'); hash.update(template);
const version = hash.digest('hex').slice(0, 16);
const assets = files.map(f => './' + f);
const manifest = { version, assets, bytes: (await Promise.all(files.map(f => stat(new URL(f, root))))).reduce((n, s) => n + s.size, 0) };
await writeFile(new URL('asset-manifest.json', root), JSON.stringify(manifest, null, 2));
await writeFile(new URL('sw.js', root), template.replace('__VERSION__', version).replace('__ASSETS__', JSON.stringify([...assets, './asset-manifest.json'])));
console.log(`已生成离线版本 ${version}，${assets.length} 个资源，${(manifest.bytes / 1024 / 1024).toFixed(2)} MB。`);
