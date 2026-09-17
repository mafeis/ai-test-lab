# How Many Pixels Does Generated Video Need to Look Sharp? H3 Resolution 0.1 → 1.0 MP, All 10 Steps Tested One by One

[中文](README.md) | English

This was a single-variable experiment: resolution is the only difference between the 10 finished clips, so every quality and time gap below comes from resolution itself. Resolution is measured in MP, where 1 MP means one million pixels (worked out from frame width × height). Bitrate is used as a side check on quality gains: it is the data a video uses per second (kbps), and a bigger number means more detail kept in the image. Per-step detail is in the sections below; the technical parameters needed to reproduce the run are at the end under "Reproduce".

## The One-Minute Version

| Question | How | Result |
|---|---|---|
| How much do pixels buy in quality, and what do they cost in time? | Same prompt, same random seed, same sampling config; only resolution raised from 0.1 MP to 1.0 MP in ~0.1MP steps, 10 steps total; each step generates 124 frames, i.e. 5.17 seconds @24fps, with H3 native audio | Time grows almost linearly with pixels: 0.1MP takes 10.5s, 1.0MP takes 252.8s, 24x the pixels ≈ 24x the time, so render cost can be budgeted straight from resolution. Quality comes in three tiers: below 0.3MP unusable; 0.3–0.5MP usable but the style is unstable; from 0.6MP up it is fully in the high-detail stable zone |
| Which step is most worth using? | Compare detail, style stability and time step by step | 0.6MP (672×896): hair highlights, skirt embroidery patterns and audience light dots in the background all sharp, at just 45% of 1.0MP's time |
| Is the top step worth it? | Compare bitrate and time between 0.9MP and 1.0MP | No: at 1.0MP the bitrate drops instead of rising (5823→5479 kbps), time is +20%, detail matches 0.9MP, and only the photoreal feel edges back up slightly |
| How to use this in production? | Combine the low step's speed with the high step's quality | Draft framing fast at 0.1MP (10s per clip), then render the final cut at 0.6MP (113s per clip) |

## Quick Compare

- Watch all 10 clips step by step: `res5s_mp0.1_00001_.mp4` … `res5s_mp1.0_00001_.mp4` (the player page [h3-res-sweep](https://mafeis.github.io/ai-test-lab/#h3-res-sweep) switches between steps)

## Full Data Table

| Step | Resolution | Render time | File size | Bitrate |
|---|---|---|---|---|
| 0.1 MP | 256×352 | **10.5s** | 555 KB | 881 kbps |
| 0.2 MP | 384×512 | 24.8s | 874 KB | 1385 kbps |
| 0.3 MP | 480×640 | 43.1s | 1495 KB | 2371 kbps |
| 0.4 MP | 544×736 | 61.6s | 1927 KB | 3056 kbps |
| 0.5 MP | 608×832 | 84.1s | 1862 KB | 2952 kbps |
| 0.6 MP | 672×896 | 113.0s | 2493 KB | 3952 kbps |
| 0.7 MP | 736×960 | 143.0s | 2562 KB | 4062 kbps |
| 0.8 MP | 768×1056 | 178.7s | 3047 KB | 4831 kbps |
| 0.9 MP | 832×1088 | 211.3s | 3673 KB | 5823 kbps |
| 1.0 MP | 896×1120 | **252.8s** | 3456 KB | 5479 kbps |

Reading each column:

- Time column: the numbers climb with resolution, no exceptions. So render time can be budgeted straight from pixel count; if you want to save time, lowering resolution is the only variable you control.
- Bitrate column: up all the way from 881 kbps to 5823 kbps at 0.9MP, which means higher resolution really does keep trading pixels for detail; then it falls back to 5479 kbps at 1.0MP, which means extra pixels no longer add information and the payoff saturates.
- File size column: 555 KB → 3673 KB, tracking the bitrate, which means the size you ship also grows almost linearly with resolution.

## Visual Verdict per Step

1. **0.1MP**: The whole image is soft and blurry, and facial contours melt into a photoreal look. This step is only good for previewing framing and camera moves, not for judging quality.
2. **0.2MP**: Full-body wide shot, stage truss structure visible; the lace texture smudges into one blur, unreadable.
3. **0.3MP**: Close-ups and depth-of-field bokeh appear; the bow tie and double-breasted buttons are clearly readable, portrait-photo quality — the starting point of the usable range.
4. **0.4MP**: **Standard cel-shaded anime face**, eye highlights on point; two separate batches hit the same style, so this step is reproducible.
5. **0.5MP**: Details are rich, but the style drifts back toward semi-realism, meaning the output style is not stable yet.
6. **0.6MP**: **Full-depth-of-field detail explosion** — hair highlights, skirt embroidery patterns and audience light dots in the background all sharp, anime look and detail at the same time, and the **best single frame of all 10 steps**.
7. **0.7MP**: Rich layers in the red-white-blue dress, steady full-body framing, quality on par with 0.6MP.
8. **0.8MP**: Full-body wide shot plus neon stage; lots of information in frame but a small character share, good for crowd shots and stage panoramas.
9. **0.9MP**: Bust close-up; every hair strand, lace thread and ribbon bow in full detail, spot-on anime face.
10. **1.0MP**: Detail matches 0.9MP, the photoreal feel edges back up slightly, and time jumps +20% — value starts to flip.

The step-by-step comparison also shows: style drift shrinks as resolution rises. From 0.6MP up everything lands in the anime style; only the low-res steps need repeated retries.

## Reproduce

Technical parameters: all 10 steps share one prompt and one random seed (seed 91720260), and the sampling config is fixed at 8-step turbo / res_multistep; these parameters never change, so every difference between the 10 steps comes from resolution alone.

| File | What it is |
|---|---|
| `res5s_mp0.1_00001_.mp4` … `res5s_mp1.0_00001_.mp4` | The 10 original clips (5.17s each, with audio); step-through playback on the [player page](https://mafeis.github.io/ai-test-lab/#h3-res-sweep) |
| `h3_res5s_workflow_template.json` | Workflow template (0.5MP example; edit width/height to reproduce any step) |

Reproduce command:

```powershell
curl.exe -X POST --data-binary "@h3_res5s_workflow_template.json" http://127.0.0.1:8188/prompt
```
