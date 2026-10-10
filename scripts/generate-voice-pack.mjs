import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { SAMPLE_IDS, selectLines, resolveProfile } from './voice-pack/core.mjs';
import { generate, pack, atomicWrite } from './voice-pack/runner.mjs';
import { requestHeaders } from './voice-pack/volcengine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const help = `家人复刻语音包（Node.js 22+）
npm run voice -- plan --profile mine --role rabbit
npm run voice -- sample --profile mine --role rabbit --env .voice-packs/volc.env
npm run voice -- generate --profile mine --role rabbit --env .voice-packs/volc.env
npm run voice -- pack --profile mine --role rabbit --env .voice-packs/volc.env --reviewed

--config 配置路径   默认 scripts/voice-pack/profiles.example.json
--env 本机环境文件  内容不打印、不写入结果
--lines ID,ID       仅 generate / pack / plan，选择具体台词
--force             仅 generate，强制重做所选台词（可能再次计费）
--reviewed          仅 pack，表示已由成人试听确认
文件写入 .voice-packs/output/<profile>/，不进入游戏构建。
sample 生成 15 句代表台词；generate 默认全量并跳过有效缓存。
pack 默认要求全量；--lines 可明确制作部分包。`;

async function main() {
  const { values: v, positionals } = parseArgs({ allowPositionals: true, options: {
    profile: { type: 'string', default: 'mine' }, role: { type: 'string', default: 'rabbit' },
    config: { type: 'string', default: 'scripts/voice-pack/profiles.example.json' }, env: { type: 'string' },
    lines: { type: 'string' }, force: { type: 'boolean' }, reviewed: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (v.help) { console.log(help); return; }
  const mode = positionals[0] ?? 'plan';
  if (positionals.length > 1 || !['plan', 'sample', 'generate', 'pack'].includes(mode)) throw new Error('命令无效，请用 --help 查看用法。');
  if ((v.force && mode !== 'generate') || (v.reviewed && mode !== 'pack') || (v.lines !== undefined && mode === 'sample')) throw new Error('参数与命令不匹配，请用 --help 查看用法。');
  if (v.env) {
    if (typeof process.loadEnvFile !== 'function') throw new Error('请使用 Node.js 22 或更新版本读取本机环境文件。');
    try { process.loadEnvFile(resolve(root, v.env)); } catch { throw new Error('无法读取指定环境文件，请检查路径和权限。'); }
  }
  let config;
  try { config = JSON.parse(await readFile(resolve(root, v.config), 'utf8')); }
  catch { throw new Error('无法读取音色配置 JSON，请检查路径和格式。'); }
  if (!config || typeof config !== 'object') throw new Error('音色配置必须为 JSON 对象。');
  const profile = resolveProfile(config, v.profile, process.env, { requireSpeaker: mode !== 'plan' });
  const lines = selectLines(v.role, mode === 'sample' ? SAMPLE_IDS : v.lines?.split(',').map(s => s.trim()));
  const directory = join(root, '.voice-packs', 'output', v.profile);
  const summary = { role: v.role, profile: v.profile, count: lines.length, characters: lines.reduce((n, l) => n + [...l.text].length, 0),
    model: profile.model, speechRate: profile.speechRate, lines };
  console.log(`${v.role} / ${v.profile}：${summary.count} 句，${summary.characters} 字符（本地统计，实际计费以平台为准）。`);
  if (mode === 'plan') {
    const output = join(directory, `plan-${v.role}.json`);
    await atomicWrite(output, JSON.stringify(summary, null, 2));
    console.log(`台词清单：${output}\n未发起远程请求。`); return;
  }
  if (mode === 'pack') { console.log(JSON.stringify(await pack({ directory, profile, role: v.role, lines, reviewed: v.reviewed, partial: v.lines !== undefined }), null, 2)); return; }
  requestHeaders(profile);
  console.log('台词将发送到火山引擎已有复刻音色，可能产生合成费用；按顺序请求，失败停止，重跑复用已完成句子。');
  console.log(JSON.stringify(await generate({ directory, profile, role: v.role, lines, force: v.force }), null, 2));
}

main().catch(error => {
  // 命令行或环境解析错误可能包含输入值，仅展示我们控制的业务错误消息。
  const message = error.code ? `本机操作失败（${error.code}），请检查参数、文件权限或使用 --help。` : error.message;
  console.error(message); process.exitCode = 1;
});
