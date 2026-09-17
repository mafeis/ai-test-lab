# Given just one frame, can MiniMax H3 rebuild a 15-second dance video with sound?

[中文](README.md) | English

The matching test record: [docs/miku-dance-optimize.md](../../docs/miku-dance-optimize.md).

## One-minute overview

This experiment hands the same Hatsune Miku dance clip to a different video model and rebuilds it. The input is a single still image (image-to-video: you give the model one picture, it outputs that picture in motion). The model is MiniMax H3, the fp8 build, running in local ComfyUI (fp8 means the weights are squashed to an 8-bit precision quantized format, which cuts VRAM use). The result goes head-to-head with the qwen original cut.

| Question | What we did | Result |
|------|------|------|
| To redo an existing dance clip, what input do you need? | Take frame 1 of the qwen3.8-flash original cut, scale it to 704×960 (picture width×height in pixels) and feed it as the first frame, so the character lines up with the original | One generation produced the finished video: 15.08s, 704×960, 24fps (24 frames per second), H.264 video + AAC audio, 3.4 MB |
| Does the background music need to be added separately? | The prompt spells out a J-pop dance track, and the model produces the audio along with the picture in the same run | The finished video carries its own synced audio track, no external music needed. The qwen original's BGM was synthesized by a program, so the two sounds come from different sources |
| Can the whole 30-second original be redone in one pass? | Plan a single run around the frame range the model was trained on: 124–362 frames | One run covers roughly 5–15 seconds (362 frames @24fps). The 30-second original can't be regenerated in a single pass, so this run output 15 seconds |

What these numbers mean: 15.08 seconds is the usable output length of one pipeline run, so it sets how long a shot a single task can cover. 3.4 MB is the size the playback page actually loads inline. And because audio and picture come from the same generation, the model itself handles the timing match between sound and image, so there is no extra audio-mixing pass outside the video.

## File list

| File | What it is |
|---|---|
| `h3_optimized_workflow.json` | The ComfyUI API-format workflow this experiment actually ran to its final version (a node table for programs to submit, without UI layout); node flow: see [Reproduce](#reproduce) |
| `h3_i2v_template.json` | ComfyUI UI-format template (the full node graph with UI layout, including the ReferenceToVideo reference-image branch); opens directly in ComfyUI for inspection |
| `node_MiniMaxH3ImageToVideo.json` | Custom node definition for MiniMaxH3ImageToVideo (parameter reference for the image-to-video node) |
| `node_MiniMaxH3ReferenceToVideo.json` | Custom node definition for MiniMaxH3ReferenceToVideo |
| `miku_first_frame.png` | Input first frame: the scaled frame 1 of the original cut; spec and how it was taken are in the table above; its job is keeping the character consistent |
| `miku_dance_optimized.mp4` | The finished video (spec in the table above) |
| `miku_dance_optimized_poster.png` | Poster frame, taken from the finished video at t=3s (second 3), used as the player card poster |

## Reusable conclusions

- The text encoder (the piece that turns prompt text into vectors the model can read) must be the matching build: `qwen_3_8b` does not match this model's dimensions (512 vs 5120), so switch to the dedicated `qwen3vl_32b_minimax_h3` encoder. The lesson: when you swap video models, the encoder belongs to the model's own kit, so don't assume it is interchangeable just because both are in the qwen family.
- Speed-up LoRAs (small models hung on the main model to cut generation steps) come in resolution tiers: the turbo 4-step LoRA v1.2 is for 768p only; a high resolution like this one needs 8-step v1.0. Pick the wrong tier and that step's compute is wasted outright.
- The upload endpoint cannot be replaced by a plain request: ComfyUI image upload requires multipart/form-data (the chunked upload format of web forms). On PowerShell 5.1, use curl.exe -F instead (command under [Reproduce](#reproduce)).

## Reproduce

Node flow of the workflow (matches `h3_optimized_workflow.json`):

```text
UNETLoader(H3 fl2va fp8) → 8-step Turbo LoRA → qwen3vl-32b CLIP → dual VAELoader(video+audio)
→ MiniMaxH3ImageToVideo(704×960, 362 frames) → BasicGuider/SamplerCustomAdvanced → CreateVideo(fps=24) → SaveVideo
```

Model dependencies (drop each file into its matching subfolder under ComfyUI's models directory; a VAE is the compress/restore component for picture or sound, and this model needs one for video and one for audio):

- `minimax_h3_fl2va_pruned_fp8_scaled.safetensors` (diffusion_models)
- `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` (loras)
- `qwen3vl_32b_minimax_h3_int8_convrot.safetensors` (text_encoders)
- `minimax_h3_video_vae_fp16.safetensors` / `minimax_h3_audio_vae_fp32.safetensors` (vae)

Submit the job:

```powershell
# Upload the first frame (must be multipart/form-data; on Windows use curl.exe -F)
curl.exe -F "image=@miku_first_frame.png" http://127.0.0.1:8188/upload/image

# Submit the workflow in API format
curl.exe -X POST --data-binary "@h3_optimized_workflow.json" http://127.0.0.1:8188/prompt
```
