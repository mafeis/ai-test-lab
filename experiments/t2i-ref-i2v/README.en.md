# Video style is decided by the first image — best-tier text-to-image outputs as the first-frame reference for H3 image-to-video (two reference images × 0.4/0.6MP, 5s with native audio)

[中文](README.md) | English

## At a glance

| Question | What we did | Result |
|---|---|---|
| Where does video style come from | Used one realistic-looking image and one anime image as the video's first frame, keeping the prompt and seed identical | Style is fully decided by the first-frame image: the realistic image gives a realistic cosplay-style video, the anime image gives a cel-shaded anime video. The prompt cannot change it — the style is locked the moment you pick the reference image |
| Is a higher video resolution worth it | Generated the same reference image at both 0.4MP and 0.6MP | Generation time grows from 70.4s to 125.6s. The gains sit in background detail (truss, light spots, lace texture); the character stays solid at both tiers. The higher tier only pays off when you need background detail |
| Does the character hold up | Checked all 4 finished videos for character elements | Twin tails, sailor uniform, and colors stay consistent throughout, with no face swap and no costume drift. No character degradation appeared within this test's duration |

> MP (megapixel) in the table is the unit of total pixel count: a higher tier means a bigger frame, more detail, and longer generation time.

## Setup

This experiment is the downstream check of [t2i-res-sweep](../t2i-res-sweep/). It takes each text-to-image model's best-tier 0.6MP output (Z-Image Turbo near-photoreal, Flux 2 Klein 9B anime) and uses it as the first-frame reference for MiniMax H3 image-to-video (fl2va, which generates a video from a first-frame image plus a text prompt). Each reference image is generated at 0.4MP (544×736) and 0.6MP (672×896) — 4 videos in total. All four share the same prompt, seed, and sampling config; the only differences are the two variables under test (reference image source, video resolution tier). Full parameters and environment are in "Reproduce" at the end.

## Generation matrix

| Reference image (source) | 0.4MP 544×736 | 0.6MP 672×896 |
|---|---|---|
| Z-Image Turbo best-tier image (near-photoreal) | [t2iref_zimg_mp0.4_00001_.mp4](t2iref_zimg_mp0.4_00001_.mp4) | [t2iref_zimg_mp0.6_00001_.mp4](t2iref_zimg_mp0.6_00001_.mp4) |
| Flux 2 Klein 9B best-tier image (anime) | [t2iref_flux2_mp0.4_00001_.mp4](t2iref_flux2_mp0.4_00001_.mp4) | [t2iref_flux2_mp0.6_00001_.mp4](t2iref_flux2_mp0.6_00001_.mp4) |

Original reference images: [ref_zimg_mp0.6.png](ref_zimg_mp0.6.png) · [ref_flux2_mp0.6.png](ref_flux2_mp0.6.png)

## Observations

1. **Style follows the reference image completely**: the video from the Z-Image reference has a live-action cosplay feel; the one from the Flux2 reference is cel-shaded anime. This shows H3 inherits the first frame's style faithfully, and the text prompt does not change the style assignment. The result cross-checks the upstream text-to-image resolution sweep.
2. **The 0.4MP → 0.6MP gain sits in the background**: stage truss, audience light spots, and lace hem texture come out clearly sharper, while the character stays solid at both tiers. This shows the higher tier buys background detail, not character quality.
3. **Character consistency is good**: twin tails, sailor uniform, and colors hold throughout — no face swap, no costume drift.
4. **Camera moves and dance rhythm correlate strongly with the first frame's composition**: under the same seed and prompt, the two 0.6MP videos open with different camera moves and dance arrangements depending on how the reference image lays out its elements. This shows the first frame sets the camera's starting point — to control the opening, adjust the first frame's composition.

## Data

| Item | Generation time (H20) | Size |
|---|---|---|
| zimg 0.4MP | 70.4s | 1273 KB |
| zimg 0.6MP | 125.7s | 1894 KB |
| flux2 0.4MP | 70.4s | 2009 KB |
| flux2 0.6MP | 125.6s | 2778 KB |

Times are measured seconds per single video generation; sizes are the files' on-disk size. H20 is the GPU model used for testing (see "Reproduce"). Time changes only with video resolution (70s → 126s, matching the t2v sweep result), independent of the reference image source. So the way to cut time is to lower the output tier; switching the reference image source does not help.

## File list

| File | Notes |
|---|---|
| `t2iref_{zimg,flux2}_mp{0.4,0.6}_00001_.mp4` | 4 finished videos (5.17s @24fps, with native AAC audio) |
| `ref_zimg_mp0.6.png` / `ref_flux2_mp0.6.png` | The two first-frame reference images (0.6MP best-tier originals) |
| `workflow_h3_i2v_ref_api.json` | API-format workflow file (an example pairing the zimg reference with the 0.6MP tier, ready to submit) |

## Reproduce (environment and technical parameters)

- Test environment: H20 GPU, local service at 127.0.0.1:8188 (submit commands below).
- Model and mode: MiniMax H3 image-to-video (fl2va).
- Seed: 91720260. The seed is the random-number value that drives generation; all four videos use the same one, which rules out randomness so the differences come only from the variables under test.
- Sampling config: turbo 8-step / res_multistep / simple.
- Duration and frame rate: 124 frames = 5.17s @24fps; finished videos carry native AAC audio.
- Resolution constraint: output width and height must both be multiples of 32.
- Run on submit: first upload the reference image with `curl.exe -F "image=@ref_zimg_mp0.6.png" http://127.0.0.1:8188/upload/image`, then `curl.exe -X POST --data-binary "@workflow_h3_i2v_ref_api.json" http://127.0.0.1:8188/prompt`. To swap the reference image, change node 6's image; to change the video tier, change node 7's width/height.
