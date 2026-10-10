# 制作家人复刻语音包

本机工具把已在火山引擎完成复刻的音色，批量用于游戏的完整短句。游戏本身继续离线播放，不连接生成服务。本次先做本人音色的小兔子，其他家人本人授权后可以按相同流程制作小熊包。

当前台词来自 `public/js/catalog.js`：每角色 106 句、885 字符；后续台词增加时工具自动读取新目录。这个字符数是本地统计，不等同于平台最终计费用量。

## 准备 API 配置

需要 Node.js 22+。在豆包语音控制台的“音色库 → 我的音色”确认已完成复刻的音色 ID（Speaker ID），然后查看“API Key”或“API 调用”。新版鉴权使用 API Key；旧版使用 App ID 和 Access Token。它们不是火山账号的通用 AccessKey/SecretKey，也不是火山方舟聊天模型的 Key。

先确认声音复刻 2.0 服务、音色调用权限和可用额度。控制台能试听并不能单独证明当前 API 凭据有权限。不要为本流程重新训练或覆盖已满意的音色。

在仓库内创建 `.voice-packs/volc.env`，只在本机编辑并设为仅本人可读：

```dotenv
VOLC_MY_SPEAKER=你的已复刻音色ID
VOLC_API_KEY=豆包语音的APIKey
```

如果控制台使用旧版鉴权，保留 `VOLC_MY_SPEAKER`，改用：

```dotenv
VOLC_APP_ID=你的AppID
VOLC_ACCESS_TOKEN=你的AccessToken
```

API Key 非空时优先使用它。不要同时保留无效的新 Key 和有效旧 Token。环境变量优先于环境文件已有同名值；切换账号前检查终端环境。文件不支持在值中引用另一个环境变量。

```bash
chmod 600 .voice-packs/volc.env
```

`.voice-packs/` 已被 Git 忽略，工具输出也在这里。不要把密钥放在命令行参数、聊天、截图或 `public/` 中。可复制 `scripts/voice-pack/profiles.example.json` 为 `.voice-packs/profiles.json`，在命令中用 `--config .voice-packs/profiles.json`；配置文件仅保存环境变量名、模型和语速，实际 ID 与密钥仍放 env 文件。

## 从小兔子样音开始

```bash
npm run voice -- plan --profile mine --role rabbit
npm run voice -- sample --profile mine --role rabbit --env .voice-packs/volc.env
```

`plan` 只导出台词清单，无网络请求。`sample` 顺序合成 15 句：欢迎、数字一到五、七种食物订单、上菜核对引导及告别。调用已有云端音色可能产生合成费用；工具不会购买资源、开通计费或训练音色。

打开 `.voice-packs/output/mine/review-rabbit.html` 试听。这是完全本地的网页，可直接双击打开，没有第三方脚本或网络请求。重点检查“一、二、三、四、五”是否干净完整，“两”与量词是否正确，西蓝花、排骨等是否清楚，语速是否合适。

初始使用原语速 `speechRate: 0` 和标准模型。若需微调，在 profile 内修改 `speechRate`（范围 -50～100，负值较慢），再生成样音；参数变化会使旧缓存失效。不要通过整体加速/变调掩盖单句读错。

## 全量生成、重做和打包

```bash
npm run voice -- generate --profile mine --role rabbit --env .voice-packs/volc.env
```

顺序处理全部台词；已完成且校验通过的样音直接复用。失败即停止，已经生成的句子保留，修正问题后运行原命令继续。工具不会自动重试；超时可能已被服务计费，重跑该句可能再次计费。

只重做一句：

```bash
npm run voice -- generate --profile mine --role rabbit --env .voice-packs/volc.env --lines order-dumpling-2 --force
```

单句重做后，运行一次全量 `generate` 刷新完整试听页（有效缓存不再次合成）。同一个音色槽位如果在云端重新训练而 Speaker ID 没变，需要 `--force` 重生成，工具无法自动知道云端训练版本发生变化。

成人听过所选台词后打包：

```bash
npm run voice -- pack --profile mine --role rabbit --env .voice-packs/volc.env --reviewed
```

`pack` 不请求云端，但需要同一个 Speaker ID 来定位缓存。缺句、损坏、全静音、时长不在 0.15～15 秒、单条 base64 超过 1,000,000 字符或整包超过 80 MiB 都会拒绝输出。不要用 `--reviewed` 代替实际试听。

输出类似 `.voice-packs/output/mine/rabbit-complete-<摘要>.voice-pack.json`。每次输出带内容摘要，不覆盖此前的语音包。只想先导入几句，可在 `pack` 中明确传 `--lines welcome,count-1`，文件名包含 `partial`；未覆盖句子继续使用游戏原有录音或默认声音。

## 导入游戏及复用

先导出游戏已有语音包留备份，再在家长区“离线与备份 → 导入语音包”选择新 JSON。游戏验证整包后显示确认提示；确认只替换相同角色、相同台词的录音。小兔子包不会删除小熊配音，两台设备分别导入相同文件即可。游戏进度不合并。

爸爸确认授权后，在本机 env 增加 `VOLC_DAD_SPEAKER` 和 `VOLC_DAD_API_KEY`，或对应旧版 `VOLC_DAD_APP_ID` / `VOLC_DAD_ACCESS_TOKEN`。如果两人音色由同一账号管理，可以在私有 profile 配置中让爸爸的鉴权环境变量名指向同一组凭据。

```bash
npm run voice -- sample --profile dad --role bear --env .voice-packs/volc.env
npm run voice -- generate --profile dad --role bear --env .voice-packs/volc.env
npm run voice -- pack --profile dad --role bear --env .voice-packs/volc.env --reviewed
```

`profile` 是音色，`role` 是动物，两者独立；可以新增其他家人的 profile。游戏当前只接受 `rabbit` 和 `bear`，语音包不能凭空创建新动物。

## 文件、隐私和清理

数据流：公开游戏台词＋指定音色 ID＋鉴权 → 火山引擎 → 本机 WAV → 成人试听 → JSON → 平板 IndexedDB。工具不上传训练录音、儿童资料、设备标识或游戏数据。密钥不进入缓存元数据、试听页、日志和最终包。

`.voice-packs/output/<profile>/cache/` 保存 WAV 和摘要，`review-<role>.html` 内嵌音频，因此试听页同样属于私人声音文件。清理时一并删除对应制作目录、分享副本和不需要的 JSON；平板端通过“恢复默认语音”删除相应句子。取消本地配置或删除文件不会删除火山云端已训练音色或样本，云端删除由本人在控制台单独处理，平台保留策略以账户条款为准。

强制结束进程可能留下 `.voice-packs/output/<profile>/.generating/` 锁目录。确认没有生成任务运行后删除这一空目录，再运行命令。不要在同一 profile 同时运行生成与打包。

接口依据：[火山引擎 HTTP Chunked / SSE V3](https://docs.volcengine.com/docs/DoubaoVoice/HTTPChunkedSSEUnidirectionalStreaming-V3?lang=zh)。已核对 `seed-icl-2.0`、新旧鉴权及 PCM 流式响应；具体账号授权和自然度仍以真实调用及成人试听为准。
