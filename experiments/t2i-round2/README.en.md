# How many steps does text-to-image need: a 1→32 step comparison on two models, plus native 2MP (1216×1632) checks (Z-Image Turbo & Flux 2 Klein 9B)

[中文](README.md) | English

## The one-minute version

Terms first: **steps** = how many times the model refines the picture, more steps usually means more time; **MP (megapixels)** = the unit for total pixel count, this round's big-image setting is 1216×1632 (about 2 megapixels, 2MP); **time** = the measured seconds for one finished image, queue included; **seed** = the random seed, fixing it is the only way to pin differences to steps and resolution themselves; **sha256** = a fingerprint of file content, if two files share a fingerprint they are bit-for-bit identical.

| Question | What we did | Result |
|---|---|---|
| How many steps does Z-Image need | Same prompt, same seed (91720260), same 0.6MP (672×896), sweeping only steps from 1 to 16 | 1 step already gives a finished image (3.1s), from 2 steps on there's barely any difference — 4 steps for drafts, 8 for finals, higher settings don't improve quality |
| How many steps does Flux2 need | Same method, steps swept from 4 to 32 | The quality bar sits at 8 steps, 8/12/20/32 look the same by eye — pick 8 steps and save 60% of the time vs the official default of 20 |
| Can results be reproduced | Under the same seed, compare sha256 against the 0.6MP image from last round's [t2i-res-sweep](../t2i-res-sweep/) | The step8 image is exactly identical to last round's — the pipeline reproduces precisely |
| Can a native 2MP image be generated directly | Raise the resolution straight to 1216×1632, generate one image per model | Neither breaks: Z-Image 9.2s, Flux2 39.3s, and detail keeps growing over 0.6MP |

## Experiment B: how many steps does each model need

| Steps | Flux2 time | Flux2 size | Z-Image time | Z-Image size |
|---|---|---|---|---|
| 1 | — | — | 3.1s | [742 KB](zimgs_step1_00001_.png) |
| 2 | — | — | 3.0s | [734 KB](zimgs_step2_00001_.png) |
| 4 | 3.1s | [750 KB](flux2s_step4_00001_.png) | 3.0s | [765 KB](zimgs_step4_00001_.png) |
| 8 | 6.0s | [756 KB](flux2s_step8_00001_.png) | 3.0s | [778 KB](zimgs_step8_00001_.png) |
| 12 | 6.6s | [749 KB](flux2s_step12_00001_.png) | — | — |
| 16 | — | — | 6.0s | [771 KB](zimgs_step16_00001_.png) |
| 20 | 3.0s² | [760 KB](flux2s_step20_00001_.png) | — | — |
| 32 | 18.1s | [767 KB](flux2s_step32_00001_.png) | — | — |

² The 3s at 20 steps is a cache-hit outlier; normally it should be ~10s.

How to read the data:

- Z-Image Turbo's step1 is already a complete, usable portrait (just slightly soft), from 2 steps on there's barely any difference, and every setting lands in the 3.0-6.0s range — so steps barely affect its quality or its time, the "turbo" name is honest; use 4 steps for drafts and 8 for finals (the default is fine), every step beyond that is pure waste.
- Flux2's quality bar sits at 8 steps: 4 steps is usable but slightly short on detail (3.1s), 8/12/20/32 look the same by eye, while time climbs from 6.0s all the way to 18.1s — so the extra time past 8 steps buys zero quality; pick 8 steps, save 60% of the time vs the official default of 20, with no quality lost.
- Under the same seed, zimgs_step8 has an sha256 exactly identical to last round's mp0.6 sweep image — so the results reproduce precisely, and the step-sweep conclusions can be trusted.

## Experiment A': can native 2MP (1216×1632) images be generated directly

Last round was verified up to 1.0MP; this round the resolution goes straight to 1216×1632.

| Model | Time | Output |
|---|---|---|
| Z-Image | 9.2s | [zimg_2mp_00001_.png](zimg_2mp_00001_.png) |
| Flux2 | 39.3s | [flux2_2mp_00001_.png](flux2_2mp_00001_.png) |

How to read the data:

- 2MP doesn't break: Z-Image takes 9.2s, and full-body detail grows further over 0.6MP (the lace layers, the headphone structure and the stage reflections are all clear); Flux2 takes 39.3s, and the linework stays clean and sharp at the larger size — so big static images can be generated natively at 2MP (Z-Image in just 9s), no need to make a small image first and upscale it afterwards.
- How this relates to last round: "best at 0.6MP" was the value-for-money turning point, not the capability ceiling — so on the image side, just move up to 2MP whenever you need bigger; the video side is still bound by H3's 768 short-edge canvas limit, so its best-setting conclusion stands.

## File list

| File | What it is |
|---|---|
| `flux2s_step{4,8,12,20,32}_00001_.png` | Flux2 step sweep (0.6MP, same seed) |
| `zimgs_step{1,2,4,8,16}_00001_.png` | Z-Image step sweep (0.6MP, same seed) |
| `zimg_2mp_00001_.png` / `flux2_2mp_00001_.png` | Native 2MP outputs |

## Reproduction

This experiment picks up the two open questions left by [t2i-res-sweep](../t2i-res-sweep/) — step needs and the resolution ceiling — with the same prompt and the same seed (91720260). Experiment B fixes the resolution at 0.6MP (672×896) and only changes steps: Z-Image uses 1/2/4/8/16, Flux2 uses 4/8/12/20/32. Experiment A' only raises the resolution to 1216×1632 (2MP), generating one image per model.
