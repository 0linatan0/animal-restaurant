# 小动物餐厅实现计划

**Goal:** 实现已批准的幼儿餐厅 PRD，提供本地配音、三种玩法和离线桌面入口。

**Architecture:** 无业务后端。纯 JavaScript 状态模型驱动 DOM 界面；IndexedDB 保存录音，localStorage 保存会话；Service Worker 原子缓存静态资源。

**Tech Stack:** JavaScript ES modules、CSS、SVG、Web Audio、IndexedDB、Service Worker；Node 内置测试；Playwright 浏览器验收。

## 全局约束

- 2～3 岁，自家使用，成人在旁、孩子主操作。
- 三种食物、两种动物、1～5 数量，默认完整提示及5分钟。
- 不联网采集用户数据，不使用第三方运行时或字体。
- 默认音频预生成并缓存；家庭录音转换为单声道 PCM WAV，便于跨端导入。
- 核心触摸目标至少72px，支持点选与单指拖动，横竖屏不丢状态。

## 实现任务

- [x] 建立纯状态模型与测试：覆盖15种订单、分类、计数、错误提示、暂停和自然收尾。文件：public/js/model.js、tests/model.test.mjs。
- [x] 建立绘本餐厅界面：SVG角色食物、首页、三模式厨房、收尾、家长防误触入口。文件：public/js/art.js、public/js/app.js、public/styles.css。
- [x] 实现家长配置与配音：台词目录、串行播放、15秒录制、PCM转换、原子导入导出、默认音频生成。文件：public/js/catalog.js、public/js/audio.js、public/js/storage.js、public/js/parents.js。
- [x] 实现PWA：版本化完整资源清单、原子缓存、离线就绪验证、显式更新、恢复会话。文件：public/sw.js、scripts/build.mjs。
- [x] 验证：Node规则测试；浏览器点餐分类自由玩、录音包和离线冷启动；横竖屏截图检查；记录真机与儿童试用尚需用户完成的项目。

## 视觉方案

- 薄荷墙 #E6F0DF、森林绿 #37644B、围裙黄 #F1C563、木桌 #E8BB86、面团白 #FFF9EB、墨褐 #4F4638。
- 字体：系统圆体优先，中文 PingFang SC，清楚的大字号；不加载外部字体。
- 主视觉是完整餐厅场景：条纹遮阳棚、手绘动物、木质操作桌。首页主操作居中；家长界面按功能组织。
- 趣味集中于动物和食物，儿童页不放数据卡片、排名或装饰性说明。
