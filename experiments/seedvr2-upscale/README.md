# SeedVR2 视频高清化 —— 放大倍数与脸部保真标定（拟真 cos / MMD 卡通双素材）

> 成片：[dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4)（推荐流程产物）· [mmd_full_15x_1056.mp4](mmd_full_15x_1056.mp4)
> 在线播放：https://mafeis.github.io/ai-test-lab/#seedvr2-upscale

生成端产出 544×960 一类的低分辨率视频后，需要一个「超分到 1440×2560 一类交付尺寸」的环节。本实验标定 ComfyUI 0.35.0 核心版 SeedVR2 节点（`seedvr2_ema_7b_fp8_e4m3fn`，7B fp8）在两条真实管线素材上的可用性、画质收益与**脸部表情保真**，并给出可复用的流程结论。

**核心结论一句话：SeedVR2 只做 1.5 倍恢复、剩余尺寸交给本地 lanczos 放大 —— 3 倍直达会把人物表情改掉（抿嘴变咧嘴露齿），1.5 倍则全程保真。**

## 测试环境与方法

- 推理端：局域网 ComfyUI 0.35.0（H20），核心节点链 `SeedVR2Preprocess → VAEEncode → SeedVR2TemporalChunk → Conditioning → KSampler(1 step, cfg 1.0) → TemporalMerge → VAEDecode → PostProcessing → SaveVideo`
- 权重：`seedvr2_ema_7b_fp8_e4m3fn.safetensors`（7B fp8）+ `ema_vae_fp16.safetensors`（VAE）；色彩校正 `lab`（CIELAB 传输，肤色最忠实）
- 提交方式：ComfyUI HTTP API（`POST /prompt` + `/history` 轮询 + `/view` 下载），单步 1 步采样 cfg 1.0，去噪 1.0，`res_multistep + simple`
- 评测方法：全片跑完下载后，用 ffmpeg 抽**同一帧位**（`select=eq(n\,N)`）做整帧与脸部局部裁剪（`crop` + `scale` 统一尺寸 + `hstack`）对比图，逐帧核对表情；耗时以墙钟计

## 测试一：拟真 cos 素材（dance05_shot1，544×960 · 124 帧 · 5.17s）

三个方案，同一帧位（第 60 帧）脸部局部对比（[compare_real_face_3way.jpg](compare_real_face_3way.jpg)）：

| 方案 | 输出 | 脸部表情 | 细节锐度 | 服务器耗时 |
|------|------|----------|----------|------------|
| A · 1.5 倍原生 | 816×1440 | ✅ 与源片一致 | 好 | 86.1s |
| B · 1.5 倍 + 本地 lanczos 1440×2560 | 1440×2560 | ✅ 与源片一致 | 好（比 A 略软半分） | 86.1s + 本地 8s |
| C · 3 倍直达 | 1440×2560 | ❌ 被改：抿嘴浅笑 → 咧嘴露齿，瞳孔重画更蓝更艳 | 略胜 B | 273.6s |

关键观察：**放大倍数越大，扩散模型对脸部的「脑补」越多**。3 倍直出时模型按训练先验重画了嘴形与眼睛——A/B 与源片并排看嘴形、牙齿露出量、眼神完全一致，C 则明显咧嘴。核心版节点没有「恢复强度」旋钮，`PostProcessing.color_correction_method` 四档（lab/wavelet/adain/none）只作用于颜色、不作用于几何，因此**倍数是唯一有效杠杆**。

成片：[dance05_15x_816.mp4](dance05_15x_816.mp4)（A）· [dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4)（B，推荐）· [dance05_3x_direct_1440.mp4](dance05_3x_direct_1440.mp4)（C，失真对照）· 源片 [dance05_source_544.mp4](dance05_source_544.mp4)

## 测试二：MMD 卡通素材（成片_初音长舞蹈 15s x2，704×960 · 724 帧 · 30.2s）

按定稿流程 1.5 倍跑全片（目标 1056×1440 等比无裁切）：

- 整帧对比（[compare_mmd_full.jpg](compare_mmd_full.jpg)）：裙子皮革高光、袖口白纱、黑丝边界各清晰一档，地面光斑轮廓变实
- 脸部对比（[compare_mmd_face.jpg](compare_mmd_face.jpg)）：眼睛与轮廓更干净，**五官与表情零改动**
- 耗时 653.5s ≈ 22 倍实时，比拟真片（约 17 倍实时）慢——人物运动幅度大，显存内时间块切得更碎

意外发现：**三渲二卡通素材比拟真素材更适合 SeedVR2**——卡通脸没有「标准真人脸」的强生成先验，模型只恢复轮廓与纹理、不重画表情；且 3D 渲染的干净边缘恢复收益更大。拟真素材的失真风险在卡通素材上天然不存在。

成片：[mmd_full_15x_1056.mp4](mmd_full_15x_1056.mp4) · 源片 [mmd_source_704.mp4](mmd_source_704.mp4)

## 落地结论

1. **定稿流程：SeedVR2 只做 1.5 倍恢复 → 本地 lanczos 拉到目标交付尺寸。** 脸部零失真、细节增强保留、服务器耗时约为大倍数直出的 1/3，观感与大倍数直出几乎无差别。
2. **倍数红线**：拟真/真人脸素材 ≤1.5 倍；卡通/非写实素材同样建议 1.5 倍起步（收益已足够，倍数再高只剩风险）。
3. **排期口径**：按素材秒数 ×15~25 估（H20 空闲队列，运动幅度大取上限）。
4. **色彩校正选 `lab`**：四档实测差异集中在颜色不影响几何，lab 肤色最忠实；wavelet 档细节略脆。
5. 工程注意：社区镜像 numz 转换的权重缺 2 枚 conditioning 张量会报 "Could not detect model type"，必须取官方转换（ModelScope `Comfy-Org/SeedVR2`）；加载器下拉能看见文件名 ≠ 能加载。
6. 脚本资产：提交/轮询/下载一条龙 `run-seedvr.mjs`（`--clip --target WxH --frames N --name --cc --go`），工作流 JSON 与权重修补脚本随实验目录留档。

## 资产清单

| 文件 | 说明 |
|------|------|
| dance05_source_544.mp4 | 测试一源片 544×960 |
| dance05_15x_816.mp4 | 方案 A：1.5 倍原生 816×1440 |
| dance05_15x_lanczos_1440.mp4 | 方案 B：1.5 倍 + lanczos 1440×2560（推荐流程 ★） |
| dance05_3x_direct_1440.mp4 | 方案 C：3 倍直达 1440×2560（表情失真对照） |
| compare_real_face_3way.jpg | 三方案同帧位脸部局部对比 |
| mmd_source_704.mp4 | 测试二源片 704×960 |
| mmd_full_15x_1056.mp4 | MMD 全片 1.5 倍 1056×1440 |
| compare_mmd_full.jpg / compare_mmd_face.jpg | MMD 整帧 / 脸部前后对比 |
| poster_real.jpg / poster_mmd.jpg | 封面帧 |
