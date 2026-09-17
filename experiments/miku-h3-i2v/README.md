# 只给一张画面，MiniMax H3 能重做出一段带声音的 15 秒跳舞片吗

配套测试记录见 [docs/miku-dance-optimize.md](../../docs/miku-dance-optimize.md)。

## 一分钟看懂

本实验把同一段初音跳舞画面交给另一套视频模型重做一遍：输入只有一张静态图（图生视频：给模型一张图，由它输出这张图动起来的视频），模型为本地 ComfyUI 中运行的 MiniMax H3 fp8 版（fp8 指把模型权重压到 8 位精度的量化格式，用于降低显存占用），产出与 qwen 原版成片横向对比。

| 问题 | 做法 | 结果 |
|------|------|------|
| 重做一段已有的舞蹈，需要准备什么输入 | 取 qwen3.8-flash 原版成片的第 1 帧，缩放至 704×960（画面宽×高的像素数）作为首帧输入，使角色与原版对齐 | 一次生成得到成片：15.08s、704×960、24fps（每秒 24 帧）、H.264 视频 + AAC 音频、3.4 MB |
| 背景音乐是否需要另外配 | 提示词写明 J-pop 舞曲，音频由模型随画面在同一次生成中产出 | 成片自带同步音轨，无需外挂音乐；qwen 原版的 BGM 为程序化合成，两者声音来源不同 |
| 30 秒原片能否整段重做 | 按模型训练覆盖的帧数范围 124–362 帧安排单次生成 | 单次可生成时长约 5–15 秒（362 帧 @24fps），30 秒原片无法单次重生成，本次输出 15 秒 |

这些数字的含义：15.08 秒是这条流水线单次可用的产出长度，决定一次任务能覆盖多长的镜头；3.4 MB 是它在播放页内嵌加载的实际体量；声音与画面出自同一次生成，意味着音频与画面的时间对应关系由模型完成，不必在成片之外再做一次合成音轨。

## 文件清单

| 文件 | 说明 |
|---|---|
| `h3_optimized_workflow.json` | 本实验实际执行到最终版的 ComfyUI API 格式工作流（供程序提交的节点表，不含界面布局）；节点走向见[复现](#复现) |
| `h3_i2v_template.json` | ComfyUI UI 格式模板（带界面布局的完整节点图，含 ReferenceToVideo 参考图分支），可在 ComfyUI 中直接打开查看 |
| `node_MiniMaxH3ImageToVideo.json` | MiniMaxH3ImageToVideo 自定义节点定义（图生视频节点的参数说明） |
| `node_MiniMaxH3ReferenceToVideo.json` | MiniMaxH3ReferenceToVideo 自定义节点定义 |
| `miku_first_frame.png` | 输入首帧：原版成片第 1 帧的缩放件，规格与取法见上表，作用是保持角色一致 |
| `miku_dance_optimized.mp4` | 成片（规格见上表） |
| `miku_dance_optimized_poster.png` | 封面帧，取成片 t=3s（第 3 秒）画面，用作播放器卡片海报 |

## 可复用的结论

- 文本编码器（把提示词文字转成模型可读向量的组件）必须用配套版本：`qwen_3_8b` 与本模型维度不匹配（512 vs 5120），须换用 `qwen3vl_32b_minimax_h3` 专用编码器。这说明换视频模型时编码器属于模型配套件，不能因为同属 qwen 系列就通用。
- 加速 LoRA（挂在主模型上、用于减少生成步数的小模型）按分辨率分档：turbo 4-step LoRA v1.2 为 768p 专用，本次这类高分辨率须用 8-step v1.0。档位选错，这一步的算力直接浪费。
- 上传接口不可用普通请求代替：ComfyUI 上传图片要求 multipart/form-data（网页表单的分段上传格式），PowerShell 5.1 下改用 curl.exe -F（命令见[复现](#复现)）。

## 复现

工作流节点走向（与 `h3_optimized_workflow.json` 一致）：

```text
UNETLoader(H3 fl2va fp8) → 8-step Turbo LoRA → qwen3vl-32b CLIP → 双 VAELoader(视频+音频)
→ MiniMaxH3ImageToVideo(704×960, 362帧) → BasicGuider/SamplerCustomAdvanced → CreateVideo(fps=24) → SaveVideo
```

模型依赖（放入 ComfyUI models 目录对应子目录；VAE 为画面与声音各自的压缩/还原组件，本模型视频、音频各需一个）：

- `minimax_h3_fl2va_pruned_fp8_scaled.safetensors`（diffusion_models）
- `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors`（loras）
- `qwen3vl_32b_minimax_h3_int8_convrot.safetensors`（text_encoders）
- `minimax_h3_video_vae_fp16.safetensors` / `minimax_h3_audio_vae_fp32.safetensors`（vae）

提交任务：

```powershell
# 上传首帧（必须 multipart/form-data，Windows 用 curl.exe -F）
curl.exe -F "image=@miku_first_frame.png" http://127.0.0.1:8188/upload/image

# 以 API 格式提交工作流
curl.exe -X POST --data-binary "@h3_optimized_workflow.json" http://127.0.0.1:8188/prompt
```
