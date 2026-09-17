# ai-test-lab

用来测试 AI 各种效果的实验仓库（Playground）。

## 🎬 AI 生成动画

### miku_dance.mp4 —— Qwen 生成

[![miku_dance 封面](images/miku_dance_poster.png)](https://mafeis.github.io/ai-test-lab/)

**▶ 点击封面直接观看** → [在线播放器](https://mafeis.github.io/ai-test-lab/) · [视频文件页](https://github.com/mafeis/ai-test-lab/blob/main/images/miku_dance.mp4)

> 注：GitHub README 出于安全策略会过滤 `<video>` 标签，无法在 README 内直接内嵌播放器，因此点击封面跳转到 GitHub Pages 播放页观看。

## 📁 目录结构（与实际文件一一对应）

```
ai-test-lab/
├── README.md                                    # 本文件：仓库导航 + 实验索引
├── index.html                                   # GitHub Pages 在线播放器（动画卡片墙，新增动画复制 card 即可）
│
├── prompts/                                     # 提示词测试用例（暂空，待补充）
├── code/                                        # AI 生成代码的效果测试（暂空，待补充）
│
├── images/                                      # 最终成片与封面（对外展示层）
│   ├── miku_dance.mp4            (5.0 MB)      # ★ 成片：Hermes+Qwen3.8-Flash 自主制作，30.000s 720×960@24fps H.264+AAC
│   └── miku_dance_poster.png   (190 KB)        # 成片封面（README / Pages 引用）
│
├── docs/                                        # 横向对比结论与测试记录
│   └── miku-dance-optimize.md    (2.3 KB)      # MiniMax H3 图生视频 vs qwen 原版 miku_dance 的优化对比记录
│
└── experiments/                                 # 实验目录：每个测试一个独立子目录
    ├── miku-blender-dance/                      # ① agent 自主 Blender 建模 + 舞蹈视频（详细测试记录）
    │   └── README.md             (5.4 KB)      #    含提示词、会话元数据、108 次工具调用统计、时间线、踩坑自愈、结论
    └── miku-h3-i2v/                             # ② MiniMax H3 图生视频重生成工作流资产
        ├── README.md             (1.8 KB)      #    文件清单 + 提交命令 + 模型依赖清单
        ├── h3_optimized_workflow.json (2.8 KB)#    ComfyUI API 格式工作流（实验实际执行的最终版）
        ├── h3_i2v_template.json (71.2 KB)    #    ComfyUI UI 格式模板（完整节点图，可直接打开）
        ├── node_MiniMaxH3ImageToVideo.json (5.1 KB)   # 自定义节点定义
        ├── node_MiniMaxH3ReferenceToVideo.json (13.4 KB)# 自定义节点定义（参考图分支）
        └── miku_first_frame.png (210 KB)     #    首帧图（原成片第 1 帧，704×960，保持角色一致）
```

> `prompts/`、`code/`、`images/`、`docs/`、`experiments/` 下的 `.gitkeep` 为空目录占位，不再逐条列出。

## 🧪 实验详细说明

### ① miku-blender-dance —— Agent 自主完成 Blender 建模与舞蹈视频

| | |
|---|---|
| **测试目标** | 验证 agent（Hermes）驱动思考档位模型能否零人工干预完成 3D 动画全流程 |
| **模型 / 档位** | Qwen3.8-Flash，reasoning effort=xhigh（最高思考档），priority |
| **执行环境** | Mac mini M2 16GB，macOS 26.6.2，Blender 5.2 无头模式 |
| **输入** | 仅 3 条自然语言指令（建模 → 继续 → 验收后做 30s 舞蹈视频），无参考图 |
| **消耗** | 227 条消息；输入 53.0 万 / 输出 10.9 万 token（思考 6.3 万）；108 次工具调用 |
| **过程亮点** | 6 轮渲染验收建模；OOM 后自主降精度自愈（258MB→64MB）；720 帧 EEVEE 渲染；程序化合成 128 BPM BGM；3 次渲染翻车（frame_end 遗漏 / 文件名污染）全部自主修复 |
| **结果** | ✅ 成功。成片即仓库 `images/miku_dance.mp4`，交付物与会话报告完全一致 |
| **记录 / 成片** | [experiments/miku-blender-dance](experiments/miku-blender-dance/) · [images/miku_dance.mp4](images/miku_dance.mp4) |

### ② miku-h3-i2v —— MiniMax H3 图生视频优化重生成

| | |
|---|---|
| **测试目标** | 用本地 ComfyUI 的 MiniMax H3 模型对①的成片做优化重生成，横向对比效果 |
| **方案** | H3 fl2va 首帧图生视频（fp8）+ 8-step Turbo LoRA + qwen3vl-32b 文本编码器，原生同步音频 |
| **首帧** | 沿用原成片第 1 帧（`miku_first_frame.png`），704×960，保持角色一致 |
| **时长** | 362 帧 ≈ 15s（H3 训练帧范围 124–362 上限，30s 原片无法单次重生成） |
| **结果** | 产出 `miku_dance_optimized_*.mp4`（H3 turbo 8-step，原生音频），与原版 30s qwen 成片形成对比 |
| **记录 / 资产** | [docs/miku-dance-optimize](docs/miku-dance-optimize.md) · [experiments/miku-h3-i2v](experiments/miku-h3-i2v/) |

## 📌 使用约定

- 每个测试一个独立子目录放在 `experiments/` 下，附 `README.md` 说明测试目标、输入和结果
- 横向对比 / 总结性结论记录在 `docs/` 下，方便跨模型、跨参数对比
- 最终成片与封面放 `images/`，供 README 和 Pages 播放器引用；实验过程资产（工作流、脚本、首帧等）留在各自实验子目录
- 新增动画：mp4 放入 `images/` 后在 `index.html` 复制一张 card 改视频路径

## 🧭 测试主题（可扩展）

- [ ] 提示词工程效果对比
- [ ] 代码生成与修复能力
- [ ] 长文本理解与摘要
- [x] 图像生成效果 → miku-h3-i2v 首帧 + H3 视频
- [x] Agent / 工具调用能力 → miku-blender-dance（108 次工具调用全流程）
