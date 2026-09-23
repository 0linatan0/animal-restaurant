# 部署记录

- 正式网址：https://little-animal-kitchen.pages.dev/
- 平台：Cloudflare Pages，Direct Upload
- 项目：little-animal-kitchen
- 发布资源版本：772e3a94b1c56262
- 发布包：dist/animal-restaurant-h5.zip
- 验证：Cloudflare 显示部署成功；正式 HTTPS 页面可打开，完整离线缓存就绪，取物后锅内减少一份、盘内增加一份。
- 平板安装：iPad Safari 分享 → 添加到主屏幕；Android Chrome 菜单 → 添加到主屏幕/安装。
- 两台设备分别从桌面图标联网打开，完成离线准备，再用飞行模式检查。
- 更新：重新构建发布包后，在同一个 Pages 项目中新建 Production 部署，保持正式网址不变。已有安装在家长区更新。
- 家人录音保存在设备上，不包含在部署包中。

## 2026-09-22 首页刷新故障（已修复上线）

- 线上首页返回 HTTP 200，但 Pages 将 `/index.html` 以 308 跳转到 `/`。旧离线缓存保存了带 `redirected` 标记的响应，Chrome 再次导航使用该响应时出现 `ERR_FAILED`。
- 修复版本：`772e3a94b1c56262`。缓存首页时重建普通响应，并在导航时兼容处理。发现旧版损坏首页缓存时自动激活修复，无需清除本机设置或录音。
- 验证：17 项单元测试通过；`tests/deployment.mjs` 模拟 Pages 跳转，验证首次准备、刷新、离线冷启动、旧版故障复现及自动恢复、设置和录音保留。
- 最新 `dist/animal-restaurant-h5.zip` 为此修复包，共 221 个文件；用户完成上传后已发布 Production，Cloudflare 显示 Success，正式资源清单版本确认为 `772e3a94b1c56262`。
- 线上验证：原先报 `ERR_FAILED` 的 Chrome 标签页首次刷新触发后台更新，随后再次刷新恢复；再刷新、新标签页重新打开均正常，保留原有订单和暂停状态。未清空任何站点数据。

## 2026-09-23 点餐扩展（本地完成，待发布）

- 本地版本：`e6232c5475a7e1cc`，227个资源，约2.62 MB；发布包仍为 `dist/animal-restaurant-h5.zip`。
- 包含同种食物余量档位、上菜自动／手动核对、实际总量确认与动物享用，新增8条内置音频。
- 已完成模型、浏览器回归与新增流程验证，详细见 `docs/ACCEPTANCE.md`。
- 本次未执行线上部署；页面顶部记录的正式版本仍为 `772e3a94b1c56262`。
