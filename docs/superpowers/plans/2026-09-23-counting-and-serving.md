# 点餐余量与上菜核对 Implementation Plan

> **For agentic workers:** 按下列任务顺序在当前任务执行，每项通过对应验证后推进。用户已授权开始处理，无需再次选择执行方式。

**Goal:** 实现同种食物余量、自动／手动上菜核对与动物享用。

**Architecture:** 游戏阶段和计数进度只在纯模型中维护；界面按步骤播放声音和动画，携带递增标识回传完成事件。取消、暂停、重试或切换时使旧标识失效。

**Tech Stack:** 原生JavaScript ES modules、CSS、内联SVG、Web Audio、IndexedDB和Service Worker；Node测试与Playwright。

## Global Constraints

- 一单一种食物，取放守恒，盘子最多五个；余量档位1～3、库存多一个。
- 核心触摸目标至少72×72 CSS像素；点击可完成全部操作。
- 不新增儿童监听、账号、上传、第三方运行时依赖。
- 家长设置下局生效，错误保留盘子，到时可随时收尾。
- 注释与提交描述使用中文，旧录音台词ID保留。

## Task 1：模型与恢复

Files: `public/js/model.js`, `public/js/catalog.js`, `tests/model.test.mjs`, `tests/serving.test.mjs`。
Interfaces: 沿用 `transition(state, action) -> {state,cues}`；新增 `settings.supply = exact|extra`、`phase=reviewing`、`flowId`、`review={mode,step,error,silent}`。动作包括 `reviewManual/reviewAuto/reviewBack/reviewDone/reviewError/reviewRetry/reviewSilent`，异步完成携带 `token: state.flowId`；轮次完成携带 `round: state.rounds`。

- [x] 新增余量和异步取消测试并运行，确认当前版本失败。
```js
let s = createSession({ supply: 'extra', quantity: '3' });
assert.equal(s.stock.length, 4);
s = transition(s, { type: 'add', food: s.order.food }).state;
s = transition(s, { type: 'submit' }).state;
assert.equal(s.phase, 'reviewing');
const token = s.flowId;
s = transition(s, { type: 'reviewManual' }).state;
assert.deepEqual(transition(s, { type: 'reviewDone', token }).state, s);
```
- [x] 实现规范化设置、库存生成、逐步核对、错误保盘、暂停和v1→v2恢复；完成事件验证标识，手动等待步骤不接收自动完成。
- [x] 更新既有模型测试中上菜后直接成功的假设，运行 `npm test`。

## Task 2：界面、语音与享用

Files: `public/js/app.js`, `public/js/parents.js`, `public/styles.css`, `public/js/catalog.js`, `public/assets/audio/`。
Interfaces: 界面从模型读取阶段和步骤；每个核对步骤只播放 `lastCue`，播放完成后 `dispatch({type:'reviewDone',token})`，失败后 `dispatch({type:'reviewError',token})`。

- [x] 家长区增加备菜选项，选择余量后规范化为1～3及完整提示并显示说明。
- [x] 实现可取消的单步骤执行器，自动指物、手动点按、重试和无声继续；核对期间禁用重听，收工提醒延期。
- [x] 增加每次完整数完的总量呈现、继续装盘与帮我数入口；所有交互保持72px触摸区。
- [x] 实现3.6秒享用场景：动物拿食物、咀嚼、盘内食物逐个消失，动画完成和跳过共用带轮次标识的推进动作；减少动态效果显示静态画面。
- [x] 复用旧音频并增加完整引导短句，执行 `npm run audio`、`npm run build`，确认生成真实可解码音频。

## Task 3：浏览器验证与基线同步

Files: `tests/browser.mjs`, `tests/serving-browser.mjs`, `package.json`, `AGENTS.md`, `docs/{PRD,PRODUCT_DESIGN,ARCHITECTURE,PROJECT_CONTEXT,DECISIONS,ROADMAP,ACCEPTANCE}.md`。

- [x] 浏览器覆盖余量设置、拿多拿少、切换重数、手动锁定、退出改盘、语音失败恢复、暂停刷新、享用跳过、三轮结束和小屏布局。
```js
await page.locator('[data-action="submit"]').click();
await page.locator('[data-action="reviewManual"]').click();
await page.waitForFunction(() => JSON.parse(localStorage.getItem('little-kitchen:session')).review.step === 'waiting');
await page.locator('[data-source="plate"]').first().click();
```
- [x] 运行 `npm test`、`npm run build`、`npm run test:browser` 及新增浏览器用例；检查截图和页面异常。保留真机验收未完成的事实。
- [x] 同步基线为两档库存规则，区分原可选数数与上菜核对；记录版本迁移和D-006扩展。路线图注明本地已实现、线上待发布。
- [x] 执行 `git diff --check`，检查仅包含相关代码、文档和内置音频；提交本地变更，不将测试产物或家庭数据入库。

## 计划自查

已覆盖设计中的备菜、上菜、双模式计数、失败恢复、库存守恒、动画、中断、兼容、声音、文档和验证。原自由厨房、分类和配音导入事务保持原流程。部署不在本次授权范围内，产物可供后续发布。

## 执行结果

25项Node测试、15组完整浏览器回归、7组新增浏览器专项与构建通过。首轮专项测试修正了测试存档注入被pagehide覆盖和恢复声音尚未完成即断言的时序；未放宽产品断言。真机与正式发布仍待后续操作。
