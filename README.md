# ai-test-lab

用来测试 AI 各种效果的实验仓库（Playground）。

## 🧪 测试项目

| # | 测试 | 模型 | 状态 | 记录 |
|---|---|---|---|---|
| 1 | **miku_blender_dance** —— Agent 自主 Blender 建模 + 30s 舞蹈视频 | Qwen3.8-Flash (xhigh) | ✅ 完成 | [详细记录](experiments/miku-blender-dance/README.md) |
| 2 | **miku_h3_i2v** —— MiniMax H3 图生视频优化重生成（对比实验，15s 含原生音频） | MiniMax H3 + qwen3vl-32b | ✅ 完成 | [对比记录](docs/miku-dance-optimize.md) · [成片](experiments/miku-h3-i2v/miku_dance_optimized.mp4) · [工作流资产](experiments/miku-h3-i2v/) |
| 3 | **miku_h3_t2v** —— H3 纯文生视频（零图片输入，画质最佳版） | MiniMax H3 + qwen3vl-32b | ✅ 完成 | [实验说明](experiments/miku-h3-t2v/README.md) · [成片](experiments/miku-h3-t2v/miku_dance_t2v.mp4) |
| 4 | **h3_res_sweep** —— H3 分辨率扫描 0.1→0.5MP（风格漂移 + 质量拐点对比） | MiniMax H3 | ✅ 完成（拐点 0.4MP） | [实验说明](experiments/h3-res-sweep/README.md) · [对比条](experiments/h3-res-sweep/comparison_strip_5s.png) |

## 🎬 在线观看

<a href="https://mafeis.github.io/ai-test-lab/"><img src="experiments/miku-h3-t2v/miku_dance_t2v_poster.png" width="260" alt="miku_dance 封面（H3 纯文生视频版，画质最佳）"></a>

**▶ 点击封面进入播放页** —— 每个测试的成片、参数和详细信息都在播放页卡片里：[https://mafeis.github.io/ai-test-lab/](https://mafeis.github.io/ai-test-lab/)

> 封面取自 t2v 版（纯文生视频，四版中画质最佳）。四版横向对比：[qwen 原版 30s](images/miku_dance.mp4) · [H3 i2v 15s](experiments/miku-h3-i2v/miku_dance_optimized.mp4) · [H3 t2v 15s](experiments/miku-h3-t2v/miku_dance_t2v.mp4) · [分辨率扫描五档](experiments/h3-res-sweep/res_comparison_5s.mp4)

## 🔄 维护约定（每次改动必读）

**任何测试相关的内容变更（新增成片 / 新增测试 / 修改资产），必须在同一次提交里同步以下三处，缺一不可：**

1. 本 README 的「测试项目」表（状态、链接）
2. `index.html` 的 `TESTS` 数组（卡片数据）
3. 对应实验目录的 `README.md`（资产清单）
