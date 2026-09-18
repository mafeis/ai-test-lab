# dunhuang-t2i-upscale · 文生图双模型 + SeedVR2 高清修复

敦煌飞天美学双人时尚人像：同一提示词、同一种子分别过 **Flux2 Klein 9B** 与 **Z-Image Turbo** 生成 2MP 原图，再用 **SeedVR2 7B（fp8 e4m3fn）** 做 2x / 4x 生成式高清修复。带拖动滑杆的前后对比查看页：[gallery.html#dunhuang-t2i-upscale](../../gallery.html#dunhuang-t2i-upscale)

## 生成条件（两模型完全一致）

| 项 | 值 |
|---|---|
| 提示词 | 中文场景描述 + 英文关键词（见 [prompt.txt](prompt.txt)） |
| 种子 | 91720260 |
| 分辨率 | 1216×1632（2MP 竖幅） |
| Flux2 | 20 步 · cfg 5 · euler · flux-2-klein-9b-fp8 |
| Z-Image | 8 步 · cfg 1 · res_multistep · z_image_turbo_int8 |

## 高清修复（SeedVR2 7B）

| 项 | 值 |
|---|---|
| 模型 | seedvr2_ema_7b_fp8_e4m3fn + ema_vae_fp16 |
| 流程 | lanczos 预放大 → SeedVR2Preprocess → tiled VAE 编码 → 1 步采样（cfg 1）→ tiled 解码 → lab 色彩校正 |
| 2x | 1216×1632 → 2432×3264（单张约 30–60s） |
| 4x | 1216×1632 → 4864×6528（单张 50s–数分钟，首张含模型冷加载） |

## 资产清单

| 文件 | 说明 |
|---|---|
| `dunhuang_flux2.png` | Flux2 原图 1216×1632 · 3.0MB |
| `dunhuang_zimg.png` | Z-Image 原图 1216×1632 · 2.4MB |
| `dunhuang_flux2_2x.jpg` | Flux2 SeedVR2 2x（页面用 JPG，2432×3264） |
| `dunhuang_zimg_2x.jpg` | Z-Image SeedVR2 2x（页面用 JPG，2432×3264） |
| `dunhuang_flux2_4x.jpg` | Flux2 SeedVR2 4x（页面用 JPG，4864×6528） |
| `dunhuang_zimg_4x.jpg` | Z-Image SeedVR2 4x（页面用 JPG，4864×6528） |
| `prompt.txt` | 完整提示词（中文场景 + 英文关键词） |
| `run_dunhuang.ps1` | 双模型文生图脚本（ComfyUI API） |
| `run_upscale.ps1` | SeedVR2 2x 修复脚本 |
| `run_upscale4x.ps1` | SeedVR2 4x 修复脚本 |

> 修复产物 PNG 母版（10–45MB）体积过大不入库，仓库存页面用 JPG（q2 高质量），PNG 母版保留在本地工作区 `dunhuang_test/`。

## 结论速览

- **构图叙事**选 Flux2：坐姿/侧卧双人关系、壁画圆盘位置完全按提示词执行
- **装饰密度**选 Z-Image：头冠、宝石链饰华丽度更高，8 步 turbo 出图快 2–3 倍
- SeedVR2 修复对**面部睫毛、金饰边缘、壁画纹样**增强明显，lab 校正保证色彩零漂移
- 2x 性价比最高；4x 解析力极限提升但文件大 4 倍，按需使用
