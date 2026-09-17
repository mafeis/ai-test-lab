# miku_dance 生成优化实验

中文 | [English](miku-dance-optimize.en.md)

## 目标

用本地 ComfyUI（127.0.0.1:8188）的 **MiniMax H3 视频生成模型** + **qwen3vl_32b 文本编码器（MiniMax H3 专用）**，
对原始 `miku_dance.mp4`（qwen3.8-flash 生成）做优化重生成，对比效果。

## 原始视频参数

| 项目 | 值 |
|---|---|
| 分辨率 | 720 × 960（竖屏） |
| 帧率 | 24 fps |
| 时长 | 30 秒 |
| 编码 | H.264 |
| 大小 | 约 5.0 MB |

## 优化版方案

- **模型**：MiniMax H3（fl2va 首帧图生视频，fp8 量化）
- **Turbo LoRA**：8-step v1.0（采样 8 步，res_multistep 采样器，simple scheduler，无 CFG）
- **首帧**：沿用原始视频第 1 帧（保持角色一致），缩放至 704×960
- **时长**：362 帧 ≈ 15 秒（模型训练范围上限，24fps）
- **音频**：H3 原生同步音频生成（J-pop 舞曲提示词）
- **提示词**：偶像编舞 + 发丝裙摆物理 + 舞台灯光 + 镜头缓移

## 结果

| 版本 | 文件 | 说明 |
|---|---|---|
| 原始 | [images/miku_dance.mp4](../images/miku_dance.mp4) | qwen3.8-flash，30s |
| 优化 v1 | [experiments/miku-h3-i2v/miku_dance_optimized.mp4](../experiments/miku-h3-i2v/miku_dance_optimized.mp4) | H3 turbo 8-step，15.08s，704×960，含原生 AAC 音频，3.4 MB |
| 纯文生 v1 | [experiments/miku-h3-t2v/miku_dance_t2v.mp4](../experiments/miku-h3-t2v/miku_dance_t2v.mp4) | H3 turbo 8-step，15.08s，704×960，零图片输入，含原生音频，7.1 MB |

## 工作流

API 格式工作流及全部资产见 [experiments/miku-h3-i2v/](../experiments/miku-h3-i2v/)，节点链：

```
UNETLoader(H3 fl2va) → LoraLoader(8step turbo) ─┐
CLIPLoader(qwen3vl-32b, minimax) ─┐                │
VAELoader(video + audio) ──┐   │                │
LoadImage(首帧) ──────────┐  │  │                │
                          ▼  ▼  ▼                │
            MiniMaxH3ImageToVideo → cond+latent  │
                     cond ─→ BasicGuider ────────┤→ SamplerCustomAdvanced
                     latent ─────────────────────┘
              ↓ VAEDecode(视频) + VAEDecodeAudio(音频)
                     CreateVideo(fps=24) → SaveVideo
```

## 备注与坑

1. GitHub README 会过滤 `<video>` 标签 —— 内嵌播放只能靠 Pages 或文件页。
2. ComfyUI 上传图片必须 multipart/form-data（Windows PowerShell 5.1 用 `curl.exe -F`）。
3. H3 训练帧范围 ~124–362 帧（5–15s），30 秒原视频无法单次重生成。
4. turbo 4-step LoRA v1.2 是 768p 专用；高分辨率用 8-step v1.0。
