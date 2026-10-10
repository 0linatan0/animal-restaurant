# 家人复刻语音包实施计划

**Goal:** 复用已训练音色，为指定游戏角色生成可导入的完整语音包。

**Architecture:** 本机工具复用台词目录，顺序调用火山接口，把成功音频写入按内容隔离的缓存。成人试听后离线生成现有 v1 包，使用原有导入事务。

**Tech Stack:** Node.js 20+ 原生 ES modules、fetch、crypto、文件系统；浏览器原生 Web Audio / IndexedDB；不新增运行时依赖。

## 全局约束

- 家人音频及凭据不进入公开资源、Git 或构建；错误日志不暴露服务响应中的隐私字段。
- 当前每角色 106 句；单声道 WAV、单句 0.15～15 秒、单条 base64 不超过 1,000,000 字符、包不超过 80 MiB。
- 本次只使用本人已完成复刻的音色；其他家人授权后复用配置。儿童端行为和导入格式不变。

## 任务 1：台词清单、配置和封装

文件：`scripts/voice-pack/core.mjs`、`scripts/voice-pack/profiles.example.json`、`tests/voice-pack.test.mjs`。

- [x] 直接读取 `LINES` / `ROLES`，验证角色、profile 和指定台词 ID；`plan` 不需要密钥、不发网络请求。
- [x] 配置只保存环境变量名称；样例分别给本人和爸爸两个 profile，角色由命令行指定。
- [x] 实现 PCM WAV 封装、时长及格式/全静音检查、SHA-256 指纹、v1 包大小和完整性校验。
- [x] 用合成测试音验证标准 WAV、边界、错误角色/台词及包内容。

## 任务 2：远程生成和恢复

文件：`scripts/voice-pack/volcengine.mjs`、`scripts/voice-pack/runner.mjs`、`scripts/generate-voice-pack.mjs`。

- [x] 支持 API Key / App ID + Token 两种鉴权；固定官方 HTTPS 端点并禁止重定向。
- [x] 流式解析换行 JSON，处理任意网络分块、最后一行无换行、成功终止和大小/超时限制。服务错误只输出状态码。
- [x] 原子写入缓存和元数据，缓存同时校验请求指纹和音频摘要；同 profile 实际 Speaker ID / 文本 / 语速变化失效，失败重跑只补缺句。
- [x] 顺序执行 15 句 sample 或完整 generate，指定 `--lines` 和 `--force` 可重做单句。
- [x] 输出无网络依赖试听页；`pack --reviewed` 完整校验所有选中句子后原子生成角色语音包。
- [x] 用模拟服务测试部分响应、鉴权失败、中断恢复、强制重做和隐私字段不落盘。

## 任务 3：接入说明与导入验收

文件：`.gitignore`、`package.json`、`docs/VOICE_PACKS.md`、项目基线文档、`tests/voice-pack-browser.mjs`。

- [x] 增加 `npm run voice -- plan|sample|generate|pack` 和私有目录忽略规则。
- [x] 写清本机配置、样音试听、批量、单句重做、角色复用、导入和删除步骤；同步云端请求的数据边界。
- [x] 运行 `npm test`（35 项通过）、`npm run build`，浏览器实际解码生成器测试包并验证导入小兔子时保留小熊。
- [ ] 用户提供配置后生成真实样音；成人确认台词效果后生成剩余句子及最终包。此项依赖凭据和试听结果，不能以测试音替代。
