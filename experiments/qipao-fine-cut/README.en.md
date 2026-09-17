# White-Gauze Qipao Studio Dance: 6 Clips Fine-Cut into One 16.8s Video with Nearly Invisible Joins

[中文](README.md) | English

> Final video: [qipao_fine_cut.mp4](qipao_fine_cut.mp4) (16.75s / 544×960 / native audio included)
> Play online: https://mafeis.github.io/ai-test-lab/#qipao-fine-cut

Same character, same studio set, same dance — 6 clips generated. This experiment answers three questions: which frames to join adjacent clips on, what order to put the six clips in, and how to put a number on join quality after the cut.

## The One-Minute Version

| Question | What we did | Result |
|------|------|------|
| 6 clips from the same prompt jump at every cut when concatenated straight, how do you cut one video that doesn't look like a collage | Scale frames down to small grayscale images and compare adjacent frames one by one (frame diff), brute-force every join to find the closest frame pair; reorder the six clips by motion amplitude; add short dissolves at the joins and encode once | 31.00s of footage becomes a 16.75s video; the worst join jump drops from 3.31x in the straight concat to 2.07x, and the last cut is 0.89x, nearly invisible |

What this means: "jump multiple" = max frame diff inside the join window ÷ the footage's normal motion level (1x means "the picture moves its usual amount"; full definition in "How Things Are Measured"). Every fine-cut join lands inside the acceptable range, while every straight-concat cut exceeds the readable ceiling. The final video is also about half as long as the straight concat, so its rhythm density nearly doubles.

## Inputs and Division of Labor

One studio outfit, one dance, 6 takes generated (5.17s each). Each of the two prompt variants is shared by several takes, and takes reusing one prompt also reuse the same first-frame design image, so character and outfit stay naturally consistent within a group — no extra style locking needed.

```
First-frame design (input) ─┐
                            ├─→ ComfyUI /history inventory ─→ /view concurrent download ─→ takes/*.mp4
Prompts (two variants)     ─┘        pull_inventory.mjs      pull_download.mjs
                                                                    │
                              Frame-diff scan → Join pre-check → Fine-cut build → Final verify ←┘
                              cut_scan     cut_joincheck  cut_build   cut_verify
```

### Parameters of the 6 Takes

| take | seed | Megapixels | Output size | Duration | First-frame design | Background audio | Full-clip motion amplitude |
|------|------|--------|----------|------|------------|----------|--------------|
| 00273 | 260918101 | 0.40 | 480×864 | 5.17s | Studio front | J-pop | 13.86 |
| 00274 | 777777 | 0.40 | 480×864 | 5.17s | Studio front | J-pop | 14.62 |
| 00275 | 260914201 | 0.98 | 768×1344 | 5.17s | Back view, breeze | Breeze ambience | 2.87 |
| 00276 | 260918311 | 0.50 | 544×960 | 5.17s | Studio front | J-pop | 10.42 |
| 00277 | 111111 | 0.98 | 768×1344 | 5.17s | Back view, breeze | Breeze ambience | 3.95 |
| 00278 | 260918312 | 0.50 | 544×960 | 5.17s | Studio front | J-pop | 16.67 |

What this means: all 6 takes run exactly the same length (5.17s); the differences sit in resolution (0.40-0.98 MP) and motion amplitude — the 4 J-pop dance takes run 10.42~16.67, while the 2 breeze slow-motion takes are only 2.87 / 3.95. That gap is exactly what drives the "high energy first, slow shots to close" ordering.

The prompts come in two variant groups, and the full text of each one is archived in [prompts.json](prompts.json):

| Group | take | Picture-prompt gist | Audio prompt |
|----|------|-----------|--------|
| Dance | 273 / 274 / 276 / 278 | White gauze qipao with gold embroidery + ultra-long twin tails, pure-white studio, hip sways / raised arms / turns / finger hearts on the beat, slow camera orbit or push-in | `upbeat J-pop dance music with a strong beat, no voices, no speech, no singing lyrics` |
| Slow motion | 275 / 277 | Same outfit, back turned with an over-the-shoulder glance / slow side sway, gauze skirt and hair drifting in a light breeze, camera push-in or right pan | `soft breeze, gentle fabric rustle. No voices, no speech, no singing` |

## The Fine-Cut Method (Four Steps, All Reproducible)

1. **Frame-diff scan** `cut_scan.mjs`: decode each take into 12fps 40×52 grayscale frames, then brute-force every ordered pair of "last 2.5s of A × first 2.5s of B" and output the best join frame and timestamp per pair; also output a motion-amplitude curve sampled every 0.5s, which marks the static head and tail of each take.
2. **Reorder by motion amplitude**: high-energy clips first, slow shots last, and pull the two takes that share one design frame apart into slots 1 and 3 — order `00273 → 00276 → 00274 → 00278 → 00277 → 00275`.
3. **Join pre-check** `cut_joincheck.mjs`: lay the 5 planned joins out as "last frame of A \| first frame of B" pairs side by side in one image ([joins_check.jpg](joins_check.jpg)) and eyeball each one before committing the cut. Numbers only shrink the candidate set — "close pixels" is not the same as "continuous motion".
4. **Fine-cut build** `cut_build.mjs`: one `filter_complex` does everything — trim the 6 clips → normalize sizes with white padding → 5 picture+audio dissolves (`xfade` / `acrossfade`, 0.22s between dance clips, 0.35s where the background track changes) → the final 0.55s fades picture and sound to white together, so the whole video is encoded exactly once.

### Kept Ranges and Final Pacing

| # | take | Kept range | Duration | Motion amplitude in range | Static share |
|----|------|----------|------|----------------|----------|
| 1 | 00273 | 0.000 – 4.030 | 4.03s | 13.80 | 2% |
| 2 | 00276 | 1.390 – 3.530 | 2.14s | 7.40 | 27% |
| 3 | 00274 | 2.220 – 3.940 | 1.72s | 16.56 | 0% |
| 4 | 00278 | 1.560 – 4.505 | 2.94s | 15.72 | 0% |
| 5 | 00277 | 2.245 – 5.170 | 2.92s | 4.44 | 100% |
| 6 | 00275 | 0.905 – 5.170 | 4.26s | 3.02 | 100% |

What this means: the straight-concat control keeps the 0.5~1s of idle frames at each take's head and tail; the fine cut trims them out, and apart from the two closing clips every kept range is only 0~27% static. The six ranges total 18.01s; minus 1.26s of dissolve overlap across the 5 joins, that gives the 16.75s final video. The first 4 clips run 7.4~16.6 in motion amplitude (dance group), the last 2 sit at 4.4 / 3.0 (slow-motion group, drifting in the breeze the whole time) — the structure is "high energy up front + static shots to close", not a steady decline.

## How Things Are Measured

Acceptance can't rely on "watch it once and feel it's smooth": a jump call at the 0.2s scale isn't reproducible, and you can't put a number on the improvement over the last version. This experiment uses the same definitions as the repo's other finished-video experiments:

- **Decode**: `ffmpeg` squeezes the video into 12fps 40×52 grayscale frames (2080 pixels per frame, 201 frames for the whole video); the brute-force scan finishes in seconds on CPU — the definition is lightweight, any machine can recompute it.
- **Metric**: frame diff = mean absolute difference (MAD) of matching pixels between adjacent frames. The mean of in-shot adjacent frame diffs is the normal motion level (the baseline): 10.40 for all 6 source takes merged, 9.89 for the final video, 10.57 for the straight-concat control.
- **Join rule**: max adjacent frame diff inside the join window ÷ baseline — that's the jump multiple used above.

| Multiple | Reading |
|------|------|
| < 1.0x | Nearly invisible |
| 1.0 ~ 1.6x | Smooth |
| 1.6 ~ 2.2x | Acceptable with a dissolve |
| > 2.2x | Jumpy, re-pick the cut point |

What this means: a jump multiple below 1.0 is hard to see by eye; above 2.2 the cut point must be re-picked. All measurements below are read this way.

- **Why this metric**: SSIM / PSNR measure global similarity, but about 80% of this footage is pure-white background, so body movement gets diluted by the white and barely moves the score — it can't detect jumps. At 40×52 grayscale the background carries no high-frequency noise, so the diff is driven by the body and the twin tails moving, and downsampling itself acts as a low-pass filter on generation noise.
- **Human review**: numbers are only for filtering and side-by-side comparison. Before committing a cut, look at [joins_check.jpg](joins_check.jpg) (5 join pairs side by side); after, look at [overview_frames.jpg](overview_frames.jpg) (the final video at 2fps × 36 contact-sheet frames, checking rhythm and pose continuity).

## Measured Joins

### The 5 Joins in the Fine Cut

| Join | Scan diff of the source pair (x baseline) | Dissolve | Max frame diff in the final window (x baseline) | Reading |
|------|--------------------------|------|----------------------------|------|
| 00273 → 00276 | 20.77 (2.00x) | 0.22s | 16.15 (1.63x) | Smooth |
| 00276 → 00274 | 18.40 (1.77x) | 0.22s | 19.71 (1.99x) | OK with dissolve |
| 00274 → 00278 | 17.07 (1.64x) | 0.22s | 18.34 (1.85x) | OK with dissolve |
| 00278 → 00277 | 25.15 (2.42x) | 0.35s | 20.50 (2.07x) | OK with dissolve |
| 00277 → 00275 | 23.58 (2.27x) | 0.35s | **8.85 (0.89x)** | Nearly invisible |

What this means: the fine cut's worst join (2.07x) sits below the straight concat's best (2.73x), and all 5 land in "Smooth" or "OK with dissolve"; the last cut, 8.85 (0.89x), is smaller than a normal frame-to-frame diff inside a shot.

### The 5 Hard Jumps in the Original-Order Concat (Control)

| Position | Time | Max frame diff (x baseline) |
|------|------|--------------------|
| 1 | ~5.17s | 29.47 (2.79x) |
| 2 | ~10.33s | 34.97 (3.31x) |
| 3 | ~15.50s | 28.81 (2.73x) |
| 4 | ~20.67s | 33.81 (3.20x) |
| 5 | ~25.83s | 30.95 (2.93x) |

What this means: with no reordering, no trimming and no dissolves, all 5 hard jumps exceed the 2.2x reading ceiling — the gap to the final video comes from three moves: ordering, cut points, and dissolves.

### Order vs Cut Points: Same Scan, Two Orders

| Join | Original order 273→274→275→276→277→278 | This experiment's order |
|------|-------------------------------|------------|
| 1 | 21.28 (2.05x) | 20.77 (2.00x) |
| 2 | 25.73 (2.47x) | 18.40 (1.77x) |
| 3 | **32.38 (3.11x)** | 17.07 (1.64x) |
| 4 | 22.67 (2.18x) | 25.15 (2.42x) |
| 5 | 23.36 (2.25x) | 23.58 (2.27x) |
| Worst join | **3.11x** | **2.42x** |

What this means: scan data and algorithm stay exactly the same; just switching the six takes to motion-amplitude order compresses the worst join from 3.11x to 2.42x. The original order's cut 3 (32.38, 3.11x) is the worst cut in the whole video, because a static slow shot got wedged between two high-energy dance clips.

### The Frame-Diff Floor

The best of all 30 ordered pairs is `00274 → 00278` at 1.64x baseline, and no pair among the 6 takes falls below baseline (full scan in [join_scan.json](join_scan.json)). So white-background dance footage has a natural frame-diff floor: "seamless hard cuts" are unreachable on this kind of material, and dissolves have to carry the residual.

## Conclusions

1. **Order beats cut-point choice**: same scan, same algorithm — just reordering the six takes already pushes the worst join down a lot (data in the "Order vs Cut Points" table); the original order wedged a static slow shot between two high-energy dance clips, and that made the worst cut.
2. **Frame diff has a floor, so keep the dissolves**: big dance moves plus a pure-white background with no edge reference make seamless hard cuts unreachable; the short dissolves (durations by clip type, see step 4 of "The Fine-Cut Method") smooth out the leftover 1.6~2.4x.
3. **Cutting static stretches saves more runtime than optimizing cut points**: each take's head and tail is idle stance and settle (motion <0.6x baseline); trimming them with the motion-amplitude curve nearly halves the runtime, and the perceived density nearly doubles.
4. **The two take groups have different background audio** (J-pop / breeze ambience); after reordering, the video naturally runs "music section → ambient close". Joins at the track switch use a longer dissolve than same-group joins (`acrossfade` at the same offset), so picture and sound transition together.
5. **Pad with white on pure-white studio footage**: black bars read as smudges on a white frame; the pad color is a scene property, not a default.
6. **Single encode**: trimming, size normalization, the 5 dissolves and the white fade-out all live in one `filter_complex`, which avoids a second encode bringing banding into the dissolve regions.
7. **Limits**: frame diff can't see semantic errors (a reversed spin can still score low), so eyeball checks stay mandatory; 12fps sampling on 24fps footage carries a ±1 frame (about 42ms) quantization error; on non-white backgrounds or non-dance footage, the baseline and the reading thresholds need recalibrating.

## File Manifest

| File | What it is |
|------|------|
| `qipao_fine_cut.mp4` | Fine-cut final video 16.75s / 7.48MB (local delivery name `jingjian_baishuisha_qipao_pengpai_6duan.mp4`) |
| `qipao_raw_concat.mp4` | Control: straight concat in original order 31.0s / 12.21MB (local name `piancheng_baishuisha_qipao_pengpai_6duan.mp4`) |
| `poster.png` | Cover, taken from the front-facing dance pose at 7.6s of the final video |
| `first_frame_dance.jpg` | First-frame design image (studio front, full body), shared by the 4 dance-group takes |
| `first_frame_breeze.png` | First-frame design image (back view in a breeze), shared by the 2 slow-motion takes |
| `joins_check.jpg` | Pre-check image: 5 join pairs "last frame of A \| first frame of B" side by side |
| `overview_frames.jpg` | Spot-check contact sheet of the final video, 2fps × 36 frames |
| `join_scan.json` | Frame-diff baseline + full scan of all 30 ordered pairs (rerun the script to diff-check) |
| `prompts.json` | Per-take archive of seed / first-frame design / full prompt for all 6 takes |
| `takes/take_00273.mp4` … `take_00278.mp4` | The 6 raw takes, 5.17s each, native audio included |
| `scripts/pull_inventory.mjs` | Step 0a: `/history` → output inventory (seed / prompt / duration) |
| `scripts/pull_download.mjs` | Step 0b: concurrent `/view` downloads, HEAD check skips already-complete files |
| `scripts/cut_scan.mjs` | Step 1: frame-diff scan (baseline / diff matrix / best join frames / motion curve) |
| `scripts/cut_joincheck.mjs` | Step 2: join "last frame \| first frame" side-by-side pre-check image |
| `scripts/cut_build.mjs` | Step 3: fine-cut build (trim + white padding + dissolves + white fade-out, single encode) |
| `scripts/cut_verify.mjs` | Step 4: final-video frame-diff acceptance + contact-sheet spot check |

## Reproduction

### Environment and Generation Parameters

- Scan and acceptance only need `ffmpeg` / `ffprobe`; generation needs the ComfyUI on the LAN H20 box.
- Image-to-video workflow: `MiniMaxH3ImageToVideo` + turbo four-step LoRA (`minimax_h3_fl2v_turbo_4step_v1.2_768p_comfyui_bf16`), text encoder `qwen3vl_32b_minimax_h3_int8_convrot`.
- Aspect 9:16; frame-count expression `max(5, round(a*24)) ... 140:132,1`, i.e. 132 frames @24fps = 5.17s, native audio out.
- Final encode: H.264 high / yuv420p / bt709 / CRF 16 preset slow / 24fps CFR (`keyint=48:scenecut=0`) / SAR 1:1 / AAC 32kHz stereo / `+faststart`.

### Two ComfyUI API Gotchas

- Video files live under `outputs.<node>.images`, not `gifs` / `videos`.
- The `prompt` field in `/history` is an array `[number, prompt_id, nodeGraph, {}, {}]` with the node graph at the 3rd item; treating it as an object silently reads invalid fields.

### Commands

```bash
export FFMPEG=ffmpeg FFPROBE=ffprobe      # Switch to absolute paths if not on PATH
E=experiments/qipao-fine-cut

# 0) Re-pull clips from ComfyUI (optional: the repo already ships takes/)
COMFY_BASE=http://<comfyui-host>:8188 node $E/scripts/pull_inventory.mjs --out /tmp/inv.json
COMFY_BASE=http://<comfyui-host>:8188 node $E/scripts/pull_download.mjs --in /tmp/inv.json --dest $E/takes

# 1~4) Scan → pre-check → build → verify (intermediates go to $E/_work, already gitignored)
node $E/scripts/cut_scan.mjs
node $E/scripts/cut_joincheck.mjs
node $E/scripts/cut_build.mjs
node $E/scripts/cut_verify.mjs
```

Scanning and acceptance are pure CPU; the whole run finishes locally in a few minutes, no GPU needed.

## Related Experiments

- Generation-side parameter basis: [h3-round2](../h3-round2/README.md) (chained continuation + audio prompt isolation), [h3-res-sweep](../h3-res-sweep/README.md) (best-resolution comparison at 0.6MP).
- Another joining route: [miku-story-30s](../miku-story-30s/README.md). Multiple takes with the same prompt and the same first frame just need a fine cut; only cross-shot storytelling needs per-shot first/last-frame dual anchors — different problems, different answers.
