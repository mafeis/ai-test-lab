# ai-test-lab

用来测试 AI 各种效果的实验仓库（Playground）。

## 🧪 测试项目

| # | 测试 | 模型 | 状态 | 记录 |
|---|---|---|---|---|
| 1 | **miku_blender_dance** —— Agent 自主 Blender 建模 + 30s 舞蹈视频 | Qwen3.8-Flash (xhigh) | ✅ 完成 | [详细记录](experiments/miku-blender-dance/README.md) |
| 2 | **miku_h3_i2v** —— MiniMax H3 图生视频优化重生成（对比实验，15s 含原生音频） | MiniMax H3 + qwen3vl-32b | ✅ 完成 | [对比记录](docs/miku-dance-optimize.md) · [成片](experiments/miku-h3-i2v/miku_dance_optimized.mp4) · [工作流资产](experiments/miku-h3-i2v/) |

## 🎬 在线观看

<a href="https://mafeis.github.io/ai-test-lab/"><img src="images/miku_dance_poster.png" width="220" alt="miku_dance 封面"></a>

**▶ 点击封面进入播放页** —— 每个测试的成片、参数和详细信息都在播放页卡片里：[https://mafeis.github.io/ai-test-lab/](https://mafeis.github.io/ai-test-lab/)

> 注：GitHub README 会过滤 `<video>` 标签无法内嵌播放，请从播放页观看。

## 🔄 维护约定（每次改动必读）

**任何测试相关的内容变更（新增成片 / 新增测试 / 修改资产），必须在同一次提交里同步以下三处，缺一不可：**

1. 本 README 的「测试项目」表（状态、链接）
2. `index.html` 的 `TESTS` 数组（卡片数据）
3. 对应实验目录的 `README.md`（资产清单）
