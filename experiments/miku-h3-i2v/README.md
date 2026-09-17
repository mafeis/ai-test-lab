# miku_dance H3 图生视频重生成 —— 工作流资产

配套测试记录见 [docs/miku-dance-optimize.md](../../docs/miku-dance-optimize.md)。

## 文件清单

| 文件 | 说明 |
|---|---|
| `h3_optimized_workflow.json` | ComfyUI **API 格式**工作流（实验实际执行的最终版）：UNETLoader(H3 fl2va fp8) → 8-step Turbo LoRA → qwen3vl-32b CLIP → 双 VAELoader(视频+音频) → MiniMaxH3ImageToVideo(704×960, 362帧) → BasicGuider/SamplerCustomAdvanced → CreateVideo(fps=24) → SaveVideo |
| `h3_i2v_template.json` | ComfyUI **UI 格式**模板工作流（完整节点图，含 ReferenceToVideo 分支，可在 ComfyUI 里直接打开） |
| `node_MiniMaxH3ImageToVideo.json` | MiniMaxH3ImageToVideo 自定义节点定义 |
| `node_MiniMaxH3ReferenceToVideo.json` | MiniMaxH3ReferenceToVideo 自定义节点定义 |
| `miku_first_frame.png` | 首帧图（取自原 qwen3.8-flash 成片第 1 帧，缩放至 704×960，保持角色一致） |

## 使用方式

```powershell
# 上传首帧（必须 multipart/form-data，Windows 用 curl.exe -F）
curl.exe -F "image=@miku_first_frame.png" http://127.0.0.1:8188/upload/image

# 以 API 格式提交工作流
curl.exe -X POST --data-binary "@h3_optimized_workflow.json" http://127.0.0.1:8188/prompt
```

## 模型依赖（放入 ComfyUI models 目录）

- `minimax_h3_fl2va_pruned_fp8_scaled.safetensors`（diffusion_models）
- `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`（loras）
- `qwen3vl_32b_minimax_h3_int8_convrot.safetensors`（text_encoders）
- `minimax_h3_video_vae_fp16.safetensors` / `minimax_h3_audio_vae_fp32.safetensors`（vae）

> 坑：turbo 4-step LoRA v1.2 是 768p 专用，高分辨率须用 8-step v1.0；H3 训练帧范围
> 约 124–362 帧（5–15s @24fps），30 秒原视频无法单次重生成。
