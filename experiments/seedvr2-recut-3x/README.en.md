# SeedVR2 whole recut upscaled 3x — the finalized pipeline's first full-clip delivery

[中文](README.md) | English

> Final cut: [recut_final_2016.mp4](recut_final_2016.mp4) (2016×2688 · 22.2s · with audio)
> Watch online: https://mafeis.github.io/ai-test-lab/#seedvr2-recut-3x
> Prior experiment: [SeedVR2 upscale calibration](../seedvr2-upscale/README.md) (where the red line came from: 3x direct changes faces / 1.5x stays true)

## The one-minute version

Last round produced the finalized pipeline (SeedVR2 only restores at 1.5x, the rest of the size is filled locally with lanczos), but the evidence stopped at 5-second clips. This time we ran it end to end on a **22.2s / 532-frame six-shot recut**: 426.6 seconds on the server plus local upscaling, and a 2016×2688 final cut in about 7 minutes, with zero expression change, frame by frame.

We also probed 3x direct on the same footage (48-frame sample): 13.3 seconds per frame, about 2 hours for the full clip, and only a touch sharper than the finalized pipeline. **The conclusion holds, and it is harder now: the finalized pipeline is the delivery default, and 3x direct does not get scheduled.**

| Option | Output size | Expressions | Time | Verdict |
|------|----------|------|------|------|
| 1.5x + local upscale fill | 2016×2688 | Zero change | 426.6s + local | ★ Final pipeline |
| 1.5x direct out | 1008×1344 | Zero change | 426.6s | Intermediate |
| 3x direct (48-frame probe) | 2016×2688 | Zero change (this clip) | 639.3s (≈13.3s/frame) | ~2h for the full clip, skip |

## New evidence this round

**1. The pipeline reproduces at delivery length.** The 22.2s clip took 426.6s ≈ 19x its own seconds, inside the calibration round's "x15~25" scheduling rule of thumb. Frame-by-frame check: no expression changes, no flicker, no tile seams — quality held across all 532 frames.

**2. "Upscaling changes faces" is a probabilistic risk, not a certainty.** The calibration round's live-action clip failed at 3x direct (a closed-mouth smile turned into a toothy grin). This live-action clip stayed clean start to finish under the 3x direct probe ([compare_face_3way.png](compare_face_3way.png) shows all three versions matching on expression). Same model, same ratio — one clip failed, one stayed safe. So the red line stays at 1.5x by clip category, and one safe run does not loosen it.

**3. The real cost of 3x direct is compute.** 13.3s/frame vs 0.8s/frame for the finalized pipeline — 16x the compute for a half-notch of sharpness. The higher the resolution, the more the time blocks get chopped up, and this ratio only gets worse.

## Asset list

| File | Notes |
|------|------|
| `recut_final_2016.mp4` | Final cut 2016×2688 (1.5x restore + lanczos fill, crf19) |
| `recut_15x_1008.mp4` | SeedVR2 1.5x direct out 1008×1344 |
| `recut_source_672.mp4` | Recut source 672×896 (six-shot reordered cut) |
| `compare_face_3way.png` | Face 3-way compare: stretched source / finalized pipeline / 3x direct |
| `compare_full_3way.jpg` | Full-frame 3-way compare (frame 20) |

## Environment and params (for reproducing)

- Identical to the calibration round: ComfyUI 0.35.0 core · SeedVR2 7B fp8 official weights · 1 step · cfg 1.0 · color correction lab
- Submit script `run-seedvr.mjs` (archived with [seedvr2-upscale](../seedvr2-upscale/README.md)): `node run-seedvr.mjs --clip <source-clip> --target 1008x1344 --name <name> --go`
- Local fill: `ffmpeg -i 15x.mp4 -vf scale=2016:2688:flags=lanczos -c:v libx264 -crf 16 -preset slow -c:a copy`
- Evaluation: full frames and face crops, three versions side by side at the same frame position; expressions checked frame by frame; timings measured on wall clock
