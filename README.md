# ai-test-lab

中文 | [English](README.en.md)

用来测试 AI 各种效果的实验仓库（Playground）。

## 🧪 测试项目

| # | 测试 | 模型 | 状态 | 记录 |
|---|---|---|---|---|
| 1 | **miku_blender_dance** · Agent 自主建模 30s 舞蹈 | Qwen3.8-Flash | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#blender-dance) |
| 2 | **miku_h3_i2v** · 图生视频优化重生成 | MiniMax H3 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#h3-i2v) |
| 3 | **miku_h3_t2v** · 纯文生视频画质最佳版 | MiniMax H3 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#h3-t2v) |
| 4 | **h3_res_sweep** · 分辨率十档扫描 | MiniMax H3 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#h3-res-sweep) |
| 5 | **t2i_res_sweep** · 双模型生图分辨率扫描 | Z-Image + Flux 2 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#t2i-res-sweep) |
| 6 | **t2i_ref_i2v** · 甜点图做首帧生视频 | H3 + 双参考图 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#t2i-ref-i2v) |
| 7 | **t2i_round2** · 步数权衡与分辨率天花板 | Z-Image + Flux 2 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#t2i-round2) |
| 8 | **h3_round2** · 链式续拍角色一致性 | MiniMax H3 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#h3-round2) |
| 9 | **miku_story_30s** · 30s 舞台小剧场 | Flux2 + H3 | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#miku-story-30s) |
| 10 | **qipao_fine_cut** · 旗袍舞 6 条精剪 | H3 + ffmpeg | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#qipao-fine-cut) |
| 11 | **miku_stage_recut** · 舞台六镜精剪 | H3 + ffmpeg | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#miku-stage-recut) |
| 12 | **seedvr2_upscale** · 放大倍数红线标定 | SeedVR2 7B | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#seedvr2-upscale) |
| 13 | **seedvr2_recut_3x** · 定稿流程全片交付 | SeedVR2 7B | ✅ 完成 | [播放页](https://mafeis.github.io/ai-test-lab/#seedvr2-recut-3x) |
| 14 | **dunhuang_t2i_upscale** · 敦煌神女生图与高清修复 | Flux2 + Z-Image + SeedVR2 7B | ✅ 完成 | [图片页](https://mafeis.github.io/ai-test-lab/gallery.html#dunhuang-t2i-upscale) |

> 细节都在播放页卡片里：数据、结论、实验说明、全部资产一键直达。图片类测试在独立图片页 [gallery.html](https://mafeis.github.io/ai-test-lab/gallery.html)。

## 🎬 在线观看

<a href="https://mafeis.github.io/ai-test-lab/"><img src="experiments/miku-h3-t2v/miku_dance_t2v_poster.png" width="260" alt="miku_dance 封面（H3 纯文生视频版，画质最佳）"></a>

**▶ 点击封面进入播放页**：[https://mafeis.github.io/ai-test-lab/](https://mafeis.github.io/ai-test-lab/)

## 🔄 维护约定（每次改动必读）

**任何测试相关的内容变更（新增成片 / 新增测试 / 修改资产），必须在同一次提交里同步以下几处，缺一不可：**

1. 本 README 的「测试项目」表（状态、链接）
2. `data/manifest.json` 登记路径 + `data/tests/<id>.json`（播放页数据，详见 [docs/adding-tests.md](docs/adding-tests.md)）
3. 对应实验目录的 `README.md`（资产清单）
4. 英文版文字：`data/tests/<id>.en.json` 与各 `README.en.md`（播放页缺 en.json 时自动回退中文）
