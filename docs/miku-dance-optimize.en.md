# miku_dance Generation Optimization Experiment

[中文](miku-dance-optimize.md) | English

## Goal

Regenerate the original `miku_dance.mp4` (made with qwen3.8-flash) and compare it against the new version. The toolchain: local ComfyUI (127.0.0.1:8188) running the **MiniMax H3 video generation model** + the **qwen3vl_32b text encoder (MiniMax H3 specific)**.

## Original Video Specs

| Item | Value |
|---|---|
| Resolution | 720 × 960 (portrait) |
| Frame rate | 24 fps |
| Duration | 30 seconds |
| Encoding | H.264 |
| Size | About 5.0 MB |

## Optimized Version Setup

- **Model**: MiniMax H3 (fl2va first-frame image-to-video, fp8 quantized)
- **Turbo LoRA**: 8-step v1.0 (8 sampling steps, res_multistep sampler, simple scheduler, no CFG)
- **First frame**: Reuse frame 1 of the original video to keep the character consistent, scaled to 704×960
- **Duration**: 362 frames ≈ 15 seconds (upper limit of the model's training range, 24fps)
- **Audio**: H3 native sync audio generation (J-pop dance track prompt)
- **Prompt**: idol choreography + hair and skirt physics + stage lighting + slow camera drift

## Results

| Version | File | Notes |
|---|---|---|
| Original | [images/miku_dance.mp4](../images/miku_dance.mp4) | qwen3.8-flash, 30s |
| Optimized v1 | [experiments/miku-h3-i2v/miku_dance_optimized.mp4](../experiments/miku-h3-i2v/miku_dance_optimized.mp4) | H3 turbo 8-step, 15.08s, 704×960, native AAC audio, 3.4 MB |
| Pure text-to-video v1 | [experiments/miku-h3-t2v/miku_dance_t2v.mp4](../experiments/miku-h3-t2v/miku_dance_t2v.mp4) | H3 turbo 8-step, 15.08s, 704×960, zero image input, native audio, 7.1 MB |

## Workflow

The API-format workflow and all assets live in [experiments/miku-h3-i2v/](../experiments/miku-h3-i2v/). Node chain:

```
UNETLoader(H3 fl2va) → LoraLoader(8step turbo) ─┐
CLIPLoader(qwen3vl-32b, minimax) ─┐                │
VAELoader(video + audio) ──┐   │                │
LoadImage(first frame) ───┐  │  │                │
                          ▼  ▼  ▼                │
            MiniMaxH3ImageToVideo → cond+latent  │
                     cond ─→ BasicGuider ────────┤→ SamplerCustomAdvanced
                     latent ─────────────────────┘
              ↓ VAEDecode(video) + VAEDecodeAudio(audio)
                     CreateVideo(fps=24) → SaveVideo
```

## Notes & Gotchas

1. GitHub README filters out `<video>` tags — inline playback only works via Pages or the file page.
2. Uploading images to ComfyUI must be multipart/form-data (on Windows PowerShell 5.1, use `curl.exe -F`).
3. H3 trains on roughly 124–362 frames (5–15s), so the 30-second original cannot be regenerated in one pass.
4. The turbo 4-step LoRA v1.2 is 768p only; for higher resolutions, use the 8-step v1.0.
