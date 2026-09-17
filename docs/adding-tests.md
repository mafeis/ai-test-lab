# AI Test Lab · 测试接入与标注规范

> 本文档是给"后续添加测试"用的完整操作手册。**核心原则：加测试只写 JSON，不改任何代码。**

仓库：<https://github.com/mafeis/ai-test-lab>
站点：<https://mafeis.github.io/ai-test-lab/>

---

## 目录

1. [整体架构](#1-整体架构)
2. [快速上手：两步接入一个新测试](#2-快速上手两步接入一个新测试)
3. [测试 JSON 完整 schema](#3-测试-json-完整-schema)
4. [标注规则（选集编号 / 甜点星标）](#4-标注规则选集编号--甜点星标)
5. [媒体素材规范](#5-媒体素材规范)
6. [播放器行为与设置持久化](#6-播放器行为与设置持久化)
7. [页面布局与交互约定](#7-页面布局与交互约定)
8. [部署流程与缓存策略](#8-部署流程与缓存策略)
9. [常见问题排查](#9-常见问题排查)

---

## 1. 整体架构

四层分离，各司其职：

| 层 | 文件 | 职责 | 何时改 |
|---|---|---|---|
| 壳 | `index.html` | 静态骨架：顶栏（分类 chips）、左播放器区、右列表栏、页脚 | 几乎不改 |
| 样式 | `assets/style.css` | 全部视觉：布局、播放器、选集方块、响应式 | 改样式时 |
| 渲染器 | `assets/app.js` | 通用逻辑：读数据→渲染列表/播放器/选集，事件委托 | 加新"能力"时 |
| **数据** | `data/manifest.json` + `data/tests/*.json` | **所有测试内容** | **每次加测试** |

关键点：`app.js` 是通用渲染器，不包含任何具体测试的信息。一个测试 = 一个 JSON 文件 + manifest 里一行路径。

```
ai-test-lab/
├── index.html                  # 壳
├── assets/
│   ├── style.css               # 全部样式
│   └── app.js                  # 通用渲染器（数据驱动）
├── data/
│   ├── manifest.json           # 测试清单（路径数组）
│   └── tests/
│       ├── blender-dance.json  # 每个测试一个 JSON
│       ├── h3-i2v.json
│       ├── h3-t2v.json
│       ├── h3-res-sweep.json
│       └── t2i-res-sweep.json
├── experiments/                # 媒体素材（视频/图片/工作流/README）
│   ├── miku-h3-i2v/
│   ├── miku-h3-t2v/
│   ├── h3-res-sweep/
│   └── t2i-res-sweep/
├── images/                     # 通用图片（如原始素材）
├── docs/
│   ├── adding-tests.md         # ← 本文档
│   └── miku-dance-optimize.md  # 实验记录
└── README.md
```

---

## 2. 快速上手：两步接入一个新测试

**① 建数据文件** `data/tests/my-test.json`：

```json
{
  "id": "my-test",
  "category": "视频生成",
  "title": "我的测试标题",
  "summary": "一句话摘要，显示在列表行和标题条",
  "date": "2026-09-17",
  "tags": [["模型名", "green"], ["关键结论", "amber"]],
  "media": {
    "type": "video",
    "src": "experiments/my-test/output.mp4",
    "poster": "experiments/my-test/poster.png"
  },
  "stats": [["耗时", "12.3s"], ["分辨率", "704×960"]],
  "findings": ["结论一", "结论二"],
  "links": [["📄 报告", "https://github.com/..."]]
}
```

**② 登记清单**：在 `data/manifest.json` 的 `tests` 数组加一行：

```json
{ "tests": [
  "data/tests/blender-dance.json",
  "data/tests/my-test.json"
]}
```

推送后即上线。URL 加 `#my-test` 可直达该测试。

---

## 3. 测试 JSON 完整 schema

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 唯一 ID，用于 URL 深链（`#id`），建议英文短横线 |
| `category` | string | ✅ | 分类名。**顶部分类 chips 自动从所有测试的 category 生成**；新分类名建议同时在 `app.js` 的 `CATEGORY_COLORS` 登记颜色（不改也不报错，用默认色） |
| `title` | string | ✅ | 标题，列表行 + 播放器标题条 |
| `summary` | string | ➖ | 摘要，列表行第二行（超长省略号）+ 标题条 |
| `date` | string | ➖ | 日期，`YYYY-MM-DD` |
| `tags` | `[label, cls][]` | ➖ | 徽章。`cls`: `green` / `amber` / `gray` / `purple` / 空（蓝） |
| `media` | object | ✅ | 媒体，见下 |
| `stats` | `[k, v][]` | ➖ | "测试数据"表格 |
| `findings` | string[] | ➖ | "结论与发现"列表 |
| `links` | `[label, url][]` | ➖ | 外链按钮（报告、工作流等） |

### media 字段（三种类型）

**单视频：**

```json
{ "type": "video", "src": "experiments/x/out.mp4", "poster": "experiments/x/poster.png" }
```

**单图片：**

```json
{ "type": "image", "src": "experiments/x/out.png" }
```

**多片段（gallery）** —— 出现"选集"方块，二次选择播放内容：

```json
{ "type": "gallery", "items": [
  { "type": "video", "src": "experiments/x/a.mp4", "poster": "experiments/x/a.png", "label": "<b>模型A 0.1MP</b> 256×352 · 10.5s" },
  { "type": "image", "src": "experiments/x/b.png", "label": "<b>模型B 0.6MP</b> 672×896 · 4.1s ★甜点" }
]}
```

- item 的 `type` 可以混排 video 和 image（画廊/视频混合也行）
- 单视频 / 单图片测试：**选集自动隐藏**，选中即直接播放
- gallery 且 ≥2 项：播放器下方出现选集方块

---

## 4. 标注规则（选集编号 / 甜点星标）

选集方块的两个自动化行为都从 `label` 解析，**不需要改代码**：

### 4.1 系列分组编号

**规则**：label 开头写 `<b>系列名 档位</b>`，渲染器提取"系列名"，按系列独立计数编号。

```html
"label": "<b>Z-Image 0.1MP</b> 256×352 · 2.0s"   → 方块显示  Z1
"label": "<b>Z-Image 0.2MP</b> 384×512 · 2.0s"   → 方块显示  Z2
…
"label": "<b>Flux2 0.1MP</b> 256×352 · 4.6s"     → 方块显示  F1（新系列重新计数）
…
"label": "<b>Flux2 0.6MP</b> 672×896 · 10.4s"    → 方块显示  F6
```

- 系列名 → 前缀：取名称里的字母首字（`Z-Image`→`Z`，`Flux2`→`F`）；前缀冲突自动改用前两个字母
- **只有一个系列时**：自动退化为纯数字 `1-N`（不加无意义前缀）
- 中文系列名同样支持（取首字）
- 系列 → 档位的分隔建议：系列名后接空格 + 数字档位（如 `Z-Image 0.6MP`），解析会去掉末尾的档位部分

### 4.2 甜点星标 ★

**规则**：label 任何位置含 `★` 字符，该选集方块自动显示金色星角标 + 金色边框；标题栏显示星标总数。

```json
{ "label": "<b>Z-Image 0.6MP</b> 672×896 · 4.1s ★甜点" }
```

```
选集 20 个 · ★2
│ Z6★ │  ← 金色 ★ 角标 + 金框，一眼锁定
```

悬停提示开头也会带 `★`。建议把 `★` 放在 label 末尾并写明含义（`★甜点` / `★推荐` / `★最快`）。

### 4.3 label 书写约定（汇总）

```html
<b>系列名 档位</b> 关键数据 · 备注 ★含义
```

- `<b>` 段 = 系列名 + 档位（决定选集编号）
- 正文：分辨率、耗时等关键数据（`·` 分隔）
- `★` 收尾标注甜点/推荐档
- label 支持 HTML（仅限 `<b>`），其余内容会被转义显示

---

## 5. 媒体素材规范

- **目录**：素材放 `experiments/<实验名>/`，与 JSON 里的相对路径一致
- **视频**：H.264 + AAC MP4，SAR 必须 1:1（正方形像素），24fps 或 30fps
- **封面**：每个视频尽量配 poster 图（首帧截图即可）：`ffmpeg -i in.mp4 -frames:v 1 poster.png`
- **尺寸**：不做统一要求——播放器按原始宽高比 letterbox 显示，**永不拉伸**
- **多档对比**：文件命名带档位（如 `zimg_mp0.1_00001_.png`），方便排序和脚本处理
- 建议同时存一份实验 `README.md`（方法、参数表）到 experiments 目录，`links` 里链过去

---

## 6. 播放器行为与设置持久化

- **舞台固定尺寸**：`min(68vh, 620px)`（移动端 `min(52vh, 440px)`），视频 `object-fit: contain`，切片不跳版
- **比例保真**：`width/height: auto; max-width/max-height: 100%`，任何分辨率都不拉伸
- **设置持久化**（localStorage，key `aitl-player-settings`）：音量 / 静音 / 倍速 / 循环模式，跨视频、跨会话保留；切视频、刷新、改测试都不重置
- **倍速**：点 `1x` 按钮弹出面板直接选，档位 `[0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5]`（慢放区细看生成过程，快放区粗筛）；改档位只需改 `app.js` 里的 `SPEEDS` 数组
- **循环**：单曲循环 / 列表循环（gallery 连播到尾回首；单片段测试循环切下一个可见测试）
- **快捷键**：空格播放/暂停 · ←→ ±5s · ↑↓ 音量 · M 静音 · L 单曲循环 · F 全屏
- **PiP / 全屏**：能力检测，不支持自动隐藏

---

## 7. 页面布局与交互约定

```
┌──────────────────────────────────┬───────────────┐
│ 顶栏：分类 chips（唯一分类入口）    │  右侧栏（sticky，│
├──────────────────────────────────┤  整栏单滚动条）  │
│                                  │ ┌───────────┐ │
│   主播放器（固定 min(68vh,620px)） │ │ 测试清单    │ │
│   object-fit: contain 不拉伸      │ │ (纯文字行) │ │
│                                  │ └───────────┘ │
├──────────────────────────────────┤ ┌───────────┐ │
│ 控制条（循环/倍速/音量/PiP/全屏）   │ │ 选集方块   │ │
├──────────────────────────────────┤ │ Z1…Z10    │ │
│ 标题条 · 测试详情（数据/结论/链接） │ │ F1…F10    │ │
└──────────────────────────────────┴─┴───────────┴─┘
```

- **分类**：只在顶部 chips；左侧没有分类列表（历史教训：多处入口容易失同步）
- **右侧栏**：sticky 独立滚动，选择播放内容不滚动主页面；**整栏只允许一条滚动条**（嵌套内滚是bug）
- **测试清单**：纯文字行（分类色点 + 标题 + 摘要），**不放缩略图**（节省空间，加载快）
- **选集方块**：紧凑网格，编号按系列分组（见 §4），当前项蓝底 + 音量条动画并自动滚入视野
- **事件绑定**：一律用容器级事件委托（`closest(".chip")` 等），DOM 重建不丢事件
- **移动端 ≤960px**：播放器在上、列表横滑；触控热区 ≥38px；音量滑杆隐藏

---

## 8. 部署流程与缓存策略

```powershell
git add -A
git commit -m "..."
git push
Start-Sleep -Seconds 75          # GitHub Pages 构建等待
# 验证：带随机参数拉线上文件，检查新内容标记
Invoke-WebRequest -Uri "https://mafeis.github.io/ai-test-lab/assets/app.js?nocache=$(Get-Random)" -UseBasicParsing
```

**缓存规则（重要）**：改动 `style.css` 或 `app.js` 后，必须同步升 `index.html` 里的版本号：

```html
<link rel="stylesheet" href="assets/style.css?v=YYYYMMDDx">
<script src="assets/app.js?v=YYYYMMDDx"></script>
```

版本字母递增（a→b→c…）。不升版本号，浏览器会用旧缓存，"明明推送了却没变化"。GitHub Pages 的 HTML 本身缓存约 10 分钟，等一两分钟再刷。

**只加测试（只动 data/ 和 experiments/）不需要升版本号。**

---

## 9. 常见问题排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 点了没反应 | 旧 JS 缓存 | 升 `index.html` 版本号后刷新 |
| 页面左下角红色错误框 | 全局错误捕获已显示异常 | 把框内文字截图定位（含文件:行号） |
| 切分类/片段报 `Cannot read properties of null` | 渲染链路对空测试判空不完整 | 检查 `renderReelNav` / `currentReel` 的 `!t` 守卫在解构**之前** |
| 选集没出现 | gallery 少于 2 项，或 `media.type` 写错 | 确认 `type: "gallery"` 且 `items.length ≥ 2` |
| 视频被拉伸/红框 | CSS 被改动破坏了 contain 规则 | 恢复 `.stage video` 的 `object-fit: contain; width/height: auto`（红框逻辑已移除，出现即缓存） |
| 出现双滚动条 | 某元素加了内部 `overflow` | 右侧栏只保留 `.sidebar` 一个滚动容器 |
| 新分类颜色不对 | 未登记色号 | 在 `app.js` 的 `CATEGORY_COLORS` 加一行 |
| 数据加载失败 | manifest 路径或 JSON 语法错误 | 检查 `data/manifest.json` 路径与 JSON 合法性；坏文件会被跳过并在 console 警告 |

**数据校验小脚本**（本地快速验证 JSON）：

```powershell
Get-ChildItem data/tests/*.json | ForEach-Object {
  try { $_ | Get-Content -Raw | ConvertFrom-Json | Out-Null; "OK  $($_.Name)" }
  catch { "BAD $($_.Name): $($_.Exception.Message)" }
}
```

---

*最后更新：2026-09-17 · 与仓库 `8d98f0e` 时的行为同步*
