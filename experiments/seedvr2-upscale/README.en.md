# SeedVR2 Video Upscaling — How Much Upscale Before Faces Break? A Measured Calibration

[中文](README.md) | English

> Recommended workflow final cut: [dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4) · [mmd_full_15x_1056.mp4](mmd_full_1056.mp4)
> Play online: https://mafeis.github.io/ai-test-lab/#seedvr2-upscale

## At a glance

AI-generated video comes out low-res (something like 544×960), but delivery needs 1440×2560. Upscaling with SeedVR2 ran into one problem: **it does not just enlarge — it paints while it enlarges, and the bigger the factor, the looser the painting gets**. On live-action footage pushed straight to 3x, the actor's closed-mouth smile became a toothy grin and the pupils were painted bluer and brighter. At 1.5x, every frame's expression matched the source.

So the final call: **SeedVR2 does the 1.5x detail-recovery pass only; a local lanczos upscale fills in the rest of the size**. Zero expression distortion, server time only about 1/3 of a direct 3x pass (86s vs 274s), and the result looks nearly the same.

| Option | Expression | Sharpness | Time for a 5s clip | Verdict |
|------|------|--------|-------------|------|
| 1.5x + local upscale to finish | Matches the source | Good (a touch softer) | 86s + 8s local | ★ Recommended |
| Direct 1.5x | Matches the source | Good | 86s | Use when the size is not enough |
| Direct 3x | **Changed**: mouth and eyes redrawn | Slightly ahead | 274s | Banned on real faces |

## Why big upscales wreck faces

When a super-resolution model fills in detail, it paints using the 'standard look' it learned in training. Faces are exactly where its templates are strongest and our eyes are the pickiest. At a small factor (1.5x) it only needs light touch-ups, so the original expression survives; at 3x the information gap is too big, and it improvises a 'standard smile'. The core-version node has no 'restoration strength' dial, and the four color-correction modes only touch color, never shape — **the upscale factor is the only switch for how much the model is allowed to draw**.

Same-frame face comparison of the three options (key evidence): [compare_real_face_3way.jpg](compare_real_face_3way.jpg) — left 1.5x, middle 1.5x + local upscale, right direct 3x. Just look at the mouth shape and how much tooth shows in the right image.

## Test 1: live-action cos footage (544×960 · 124 frames · 5.17s)

One clip, three routes, each run once. From each final cut, pulled the same frame position, cropped the face, enlarged it and lined the crops up for a frame-by-frame expression check:

| Option | Output size | Expression check | Server time |
|------|----------|----------|------------|
| A · Direct 1.5x | 816×1440 | Matches the source | 86.1s |
| B · 1.5x + local upscale | 1440×2560 | Matches the source | 86.1s + 8s local |
| C · Direct 3x | 1440×2560 | **Changed**: closed-mouth smile → toothy grin, pupils redrawn | 273.6s |

Final-cut comparison: source [dance05_source_544.mp4](dance05_source_544.mp4) · A [dance05_15x_816.mp4](dance05_15x_816.mp4) · B [dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4) · C [dance05_3x_direct_1440.mp4](dance05_3x_direct_1440.mp4). C really is a bit sharper — but that small gain does not pay for a changed expression.

## Test 2: MMD cartoon footage (704×960 · 724 frames · 30.2s full clip)

Ran the full clip at 1.5x per the final workflow (output 1056×1440):

- Image gains: leather highlights on the skirt, the white sheer at the cuffs, and the edge of the black stockings each come out one step sharper, and the floor light-spot outlines firm up ([compare_mmd_full.jpg](compare_mmd_full.jpg));
- Face: **zero changes to features or expression** ([compare_mmd_face.jpg](compare_mmd_face.jpg)).

Unexpected finding: **cartoon footage suits this model better than photoreal footage**. A cartoon face has no 'standard real face' template to copy, so the model restores outlines and texture without redrawing expressions — the distortion risk of photoreal footage simply does not exist here, and the clean edges of 3D rendering actually gain more. Final cut [mmd_full_15x_1056.mp4](mmd_full_15x_1056.mp4) · source [mmd_source_704.mp4](mmd_source_704.mp4).

## Rules to apply

1. **Final workflow**: SeedVR2 does the 1.5x restoration only → local lanczos pulls it up to the delivery size.
2. **Factor red line**: live-action/photoreal footage never goes past 1.5x; cartoon footage starts at 1.5x too (the gain is already there, extra factor only leaves risk).
3. **Larger deliverables with real people in them**: route the face region through a face-fidelity model (CodeFormer/GFPGAN type) as a separate pass — no big-factor direct pass on the whole frame.
4. **Scheduling rule**: clip seconds ×15~25 (measured on an idle H20 queue; heavy character motion takes the upper bound, because temporal blocks get chopped finer). E.g. a 5.17s clip took 86s, a 30.2s full clip took 653.5s.
5. **Pick lab for color correction**: the four modes differ in color only, not shape; lab is most faithful for skin tones, wavelet makes detail slightly brittle.
6. **Take the official converted weights** (ModelScope `Comfy-Org/SeedVR2`): a community mirror missing 2 tensors throws "Could not detect model type"; seeing the file name in the dropdown does not mean it will load.

## Environment and parameters (for reproduction)

- Inference side: LAN ComfyUI 0.35.0 core version, SeedVR2 node chain `SeedVR2Preprocess → VAEEncode → SeedVR2TemporalChunk → Conditioning → KSampler → TemporalMerge → VAEDecode → PostProcessing → SaveVideo`
- Weights: `seedvr2_ema_7b_fp8_e4m3fn.safetensors` (7B fp8) + `ema_vae_fp16.safetensors`; color correction `lab`
- Sampling: 1 step · cfg 1.0 · denoise 1.0 · `res_multistep + simple`
- Submission: ComfyUI HTTP API (`POST /prompt` + `/history` polling + `/view` download); the script `run-seedvr.mjs` (`--clip --target WxH --frames N --name --cc --go`) is archived with the experiment directory
- Evaluation: ffmpeg pulls the same frame position for full-frame and face-crop comparison images, expressions checked frame by frame; timing measured by wall clock

## Asset list

| File | What it is |
|------|--------|
| dance05_source_544.mp4 | Test 1 source clip |
| dance05_15x_816.mp4 | Option A: direct 1.5x |
| dance05_15x_lanczos_1440.mp4 | Option B: recommended workflow ★ |
| dance05_3x_direct_1440.mp4 | Option C: direct 3x (expression-distortion reference) |
| compare_real_face_3way.jpg | Same-frame face comparison of the three options (key evidence) |
| mmd_source_704.mp4 / mmd_full_15x_1056.mp4 | Test 2 source clip / 1.5x full clip |
| compare_mmd_full.jpg / compare_mmd_face.jpg | Cartoon full-frame / face before-after comparison |
| poster_real.jpg / poster_mmd.jpg | Cover frames |
