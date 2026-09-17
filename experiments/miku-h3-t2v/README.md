# miku_dance H3 纯文生视频 —— 工作流资产

配套对比记录见 [docs/miku-dance-optimize.md](../../docs/miku-dance-optimize.md)，
图生视频版本见 [experiments/miku-h3-i2v/](../miku-h3-i2v/)。

## 与 i2v 版的区别

| 项目 | i2v（图生视频） | t2v（本实验，纯文生视频） |
|---|---|---|
| 输入 | 原成片第 1 帧（角色锚定） | 无图片，仅文字描述 |
| 角色一致性 | 首帧硬锚定 | 依赖提示词完整描述（双马尾/绿发/裙装等） |
| 成片大小 | 3.4 MB | 7.1 MB（细节更丰富） |

## 成片

`miku_dance_t2v.mp4`：704×960 @24fps、15.08s、H.264 + AAC（H3 原生 J-pop 音轨）、7.1 MB

## 文件清单

| 文件 | 说明 |
|---|---|
| `h3_t2v_workflow.json` | ComfyUI **API 格式**工作流（实验实际执行的最终版，无任何图片输入） |
| `miku_dance_t2v.mp4` | 成片 |
| `miku_dance_t2v_poster.png` | 成片封面帧（t=3s） |

节点链与 i2v 版完全一致（UNETLoader → 8-step Turbo LoRA → qwen3vl-32b CLIP → MiniMaxH3ImageToVideo → SamplerCustomAdvanced → 双 VAE 解码 → CreateVideo → SaveVideo），唯一区别：**MiniMaxH3ImageToVideo 不接 first_frame**，即退化为纯文生视频。

## 使用方式

```powershell
# 以 API 格式提交工作流（无需上传任何图片）
curl.exe -X POST --data-binary "@h3_t2v_workflow.json" http://127.0.0.1:8188/prompt
```

模型依赖同 [experiments/miku-h3-i2v/README.md](../miku-h3-i2v/README.md)。
