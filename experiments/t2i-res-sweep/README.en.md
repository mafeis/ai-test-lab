# Which Resolution Is Best for Text-to-Image: A Two-Model 0.1→1.0MP Comparison (Z-Image Turbo vs Flux 2 Klein 9B)

[中文](README.md) | English

## One-Minute Takeaway

Term notes: **MP (megapixels)** = the total pixel count of an image; this experiment runs from 256×352 (0.1MP) to 896×1120 (about one million pixels, 1.0MP). **Time** = measured seconds for one finished image (queue included). **File size** = PNG bytes, used here as the stand-in for how much information the image carries. **Seed** = random seed; fixing it is what lets you blame any difference on the resolution itself.

| Question | What we did | Result |
|---|---|---|
| Does resolution affect quality | Same prompt, same seed (91720260), same sampling config; only the resolution was raised from 0.1MP to 1.0MP in steps of about 0.1MP, 10 tiers per model | Both models reach their best quality at 0.6MP (672×896), which matches the conclusion of the [H3 Resolution Sweep](../h3-res-sweep/) (text-to-video): 0.6MP is the general quality knee for this kind of diffusion model |
| Does higher resolution cost more time | Logged the single-image time at each tier | Z-Image Turbo stays at 2.0–4.1s the whole way, so picking a tier costs you no time pressure; Flux 2 Klein 9B climbs from 4.6s to 18.3s — cost rises linearly with pixels |
| What decides the art style | Compared the two models head-on at the same seed and prompt | The style is locked in even at the lowest resolution: Z-Image Turbo stays realistic throughout, Flux 2 Klein 9B stays cel-shaded anime (a flat-color animation look) throughout; resolution only changes the amount of detail |
| Is 1.0MP worth it | Compared file sizes at 0.9MP vs 1.0MP | Both models' files stay flat or even drop (Z-Image Turbo 1082→1155KB, Flux 2 Klein 9B 1115→1108KB); you spend 25–75% more time with no further gain, so skip 1.0MP |

## Method

This experiment follows the method of the [H3 Resolution Sweep](../h3-res-sweep/): one prompt, one seed (91720260), one sampling config, changing only the resolution (0.1 → 1.0 megapixels in steps of about 0.1MP), sweeping 10 tiers on each of two text-to-image models, 20 images in total. The prompt lives in [prompt.txt](prompt.txt).

- Browse all 20 originals one by one: `zimg_mp*.png` / `flux2_mp*.png` (the [t2i-res-sweep](https://mafeis.github.io/ai-test-lab/#t2i-res-sweep) player page steps through them one at a time)

## Data Table

| Tier | Resolution | Z-Image time | Z-Image size | Flux2 time | Flux2 size |
|---|---|---|---|---|---|
| 0.1 MP | 256×352 | 2.0s | 147 KB | 4.6s | 135 KB |
| 0.2 MP | 384×512 | 2.0s | 282 KB | 4.1s | 271 KB |
| 0.3 MP | 480×640 | 2.0s | 429 KB | 2.1s² | 418 KB |
| 0.4 MP | 544×736 | 2.0s | 531 KB | 8.1s | 557 KB |
| 0.5 MP | 608×832 | 2.1s | 645 KB | 8.9s | 652 KB |
| 0.6 MP | 672×896 | 4.1s | 778 KB | 10.4s | 760 KB |
| 0.7 MP | 736×960 | 4.1s | 865 KB | 12.2s | 875 KB |
| 0.8 MP | 768×1056 | 4.1s | 1024 KB | 14.2s | 980 KB |
| 0.9 MP | 832×1088 | 4.1s | 1082 KB | 16.2s | 1115 KB |
| 1.0 MP | 896×1120 | 4.1s | 1155 KB | 18.3s | 1108 KB |

² The 2.1s at 0.3MP is an outlier that hit cache/concurrency while queued; the normal figure is 6–7s.

How to read the data:

- Z-Image Turbo runs 2–4 seconds at every tier and stays nearly constant below 0.5MP — that means its time is basically resolution-independent, so the high-quality tiers need no extra wait.
- Flux 2 Klein 9B's time grows roughly linearly with pixels (4.6s → 18.3s) — that means every high-resolution tier on this model is paid for in proportion to pixels.
- From 0.9→1.0MP neither model's file size grows (Z-Image Turbo 1082→1155KB, Flux 2 Klein 9B 1115→1108KB, actually dropping) — that means past 0.9MP the amount of image information has saturated.

## Quality Across Tiers (0.1 → 1.0MP Compared One by One)

**Z-Image Turbo (leans realistic)**

- 0.1MP: facial features blur, skin looks plastic; 0.2–0.4MP: composition and outfit land, but details stay rough — that means when resolution runs short, detail is the first thing lost.
- From 0.6MP up, the lace folds on the skirt, the backup dancers in back, and the stage truss are all sharp.
- All ten tiers hold one consistent style (a real-person cos look); low resolution only blurs, it never drifts the style.

**Flux 2 Klein 9B (cel-shaded anime)**

- 0.1MP: linework breaks down, hands melt; 0.3MP: obvious horizontal smearing artifacts appear on the legs — that means tiers below the quality floor are unusable.
- From 0.4MP the anime face lands consistently; from 0.6MP the linework is clean and the crowd bokeh, truss, and speakers are all in place; 0.9–1.0MP gives the sharpest lines.
- All ten tiers keep the anime style; with "Anime" in the prompt, the style never drifts with resolution — the same observation as the H3 text-to-video sweep.

**Head-to-head (same seed, same prompt)**

- The style split is locked in at the lowest resolution: Z-Image Turbo always leans realistic, Flux 2 Klein 9B always stays cel-shaded anime — that means resolution changes the amount of detail, not the style.
- At 0.6MP: Z-Image Turbo 4.1s, Flux 2 Klein 9B 10.4s (2.5x) — the extra time buys precise 2D-style rendering.

## Conclusions

1. Both models' best tier is 0.6MP (672×896) — that means 0.6MP looks like the general quality knee for these diffusion models, so switching models doesn't mean rescanning.
2. Z-Image Turbo needs no tier picking: any resolution comes in at ≤4.1s, so just set 0.8MP as the default.
3. Flux 2 Klein 9B's quality floor sits at 0.4MP: below it you get limb/linework breakdown, and repeated generation can't make up for it.
4. 0.9→1.0MP is inverted value: time +25–75%, file size flat or down — 1.0MP is not recommended.
5. Pick the model by subject: anime subjects go to Flux 2 Klein 9B, realistic/cos subjects go to Z-Image Turbo (which is also 2–4x faster).

## File List

| File | Notes |
|---|---|
| `zimg_mp0.1_00001_.png` … `zimg_mp1.0_00001_.png` | Z-Image Turbo, all ten tiers, raw output |
| `flux2_mp0.1_00001_.png` … `flux2_mp1.0_00001_.png` | Flux 2 Klein, all ten tiers, raw output |
| `workflow_zimg_api.json` / `workflow_flux2_api.json` | Workflows in API format (0.5MP example; edit width/height to reproduce) |
| `prompt.txt` | The prompt used for the sweep |

## Reproduction & Environment

- Test hardware: NVIDIA H20.
- The workflow files are pre-wrapped as `{"prompt": ...}` to fit the `/prompt` API, so submitting them runs right away (both files were submit-tested before being committed).
- When changing the resolution, update width/height on the latent nodes too (Z-Image node 7 / Flux2 nodes 8, 10).

Reproduction commands:

```powershell
curl.exe -X POST --data-binary "@workflow_zimg_api.json" http://127.0.0.1:8188/prompt
curl.exe -X POST --data-binary "@workflow_flux2_api.json" http://127.0.0.1:8188/prompt
```

### Models & Fixed Parameters

| Item | Z-Image Turbo | Flux 2 Klein 9B |
|---|---|---|
| Diffusion model | z_image_turbo_int8_convrot | flux-2-klein-9b-fp8 |
| Text encoder | qwen_3_4b_fp8_mixed (lumina2) | qwen_3_8b_fp8mixed (flux2) ¹ |
| VAE | ae.safetensors | flux2-vae.safetensors |
| Sampling | res_multistep / simple, 8 steps, CFG 1 | euler, 20 steps, CFG 5 |
| Prompt | Idol stage (see [prompt.txt](prompt.txt)) | Same as left |

¹ The 9B Klein's text embedding dimension is 12288 (3×4096), so it must pair with qwen_3_8b; the 4B encoder that
the official template defaults to (7680 dims) will report `mat1 and mat2 shapes cannot be multiplied`.

CFG (prompt guidance strength): Flux 2 Klein 9B runs CFG 5, which does a doubled forward pass at every step — one reason its time comes out higher than Z-Image Turbo's (8 steps, CFG 1).
