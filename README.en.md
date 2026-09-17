# ai-test-lab

[中文](README.md) | English

A playground repo for testing all kinds of AI effects.

## 🧪 Test Projects

| # | Test | Model | Status | Record |
|---|---|---|---|---|
| 1 | **miku_blender_dance** · Agent builds a 30s dance on its own | Qwen3.8-Flash | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#blender-dance) |
| 2 | **miku_h3_i2v** · Optimized image-to-video regen | MiniMax H3 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#h3-i2v) |
| 3 | **miku_h3_t2v** · Best-quality pure text-to-video version | MiniMax H3 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#h3-t2v) |
| 4 | **h3_res_sweep** · 10-step resolution sweep | MiniMax H3 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#h3-res-sweep) |
| 5 | **t2i_res_sweep** · Two-model image resolution sweep | Z-Image + Flux 2 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#t2i-res-sweep) |
| 6 | **t2i_ref_i2v** · Sweet-spot image as the video's first frame | H3 + dual reference images | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#t2i-ref-i2v) |
| 7 | **t2i_round2** · Step-count trade-off and the resolution ceiling | Z-Image + Flux 2 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#t2i-round2) |
| 8 | **h3_round2** · Character consistency across chained shots | MiniMax H3 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#h3-round2) |
| 9 | **miku_story_30s** · 30s stage mini-show | Flux2 + H3 | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#miku-story-30s) |
| 10 | **qipao_fine_cut** · 6 fine-cut qipao dance clips | H3 + ffmpeg | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#qipao-fine-cut) |
| 11 | **miku_stage_recut** · Fine-cut stage sequence, 6 shots | H3 + ffmpeg | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#miku-stage-recut) |
| 12 | **seedvr2_upscale** · Finding the upscale red line | SeedVR2 7B | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#seedvr2-upscale) |
| 13 | **seedvr2_recut_3x** · Full-video delivery with the locked pipeline | SeedVR2 7B | ✅ Done | [Player page](https://mafeis.github.io/ai-test-lab/#seedvr2-recut-3x) |

> All the details live on the player page cards: data, conclusions, experiment notes, and one-click access to every asset.

## 🎬 Watch Online

<a href="https://mafeis.github.io/ai-test-lab/"><img src="experiments/miku-h3-t2v/miku_dance_t2v_poster.png" width="260" alt="miku_dance cover (H3 pure text-to-video, best quality)"></a>

**▶ Click the cover to open the player page**: [https://mafeis.github.io/ai-test-lab/](https://mafeis.github.io/ai-test-lab/)

## 🔄 Maintenance Rules (read before every change)

**Any test-related content change (new final video / new test / asset edits) must update all 3 places below in the same commit. No exceptions:**

1. The "Test Projects" table in this README (status, links)
2. Path entry in `data/manifest.json` + `data/tests/<id>.json` (player page data, see [docs/adding-tests.md](docs/adding-tests.md))
3. The `README.md` of the matching experiment folder (asset list)
4. English copies: `data/tests/<id>.en.json` and each `README.en.md` (the player falls back to the Chinese file when an `.en.json` is missing)
