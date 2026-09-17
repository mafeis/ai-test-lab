# SeedVR2 视频高清化 —— 放大多少倍才不会把脸改坏？实测标定

> 推荐流程成片：[dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4) · [mmd_full_15x_1056.mp4](mmd_full_1056.mp4)
> 在线播放：https://mafeis.github.io/ai-test-lab/#seedvr2-upscale

## 一分钟看懂

AI 生成的视频分辨率低（544×960 一类），交付要 1440×2560。用超分模型 SeedVR2 放大时遇到一个问题：**它不是单纯放大，而是边放大边补画——放得越大，补画越随意**。真人素材放大 3 倍直达时，演员的抿嘴浅笑被改成了咧嘴露齿，瞳孔被画得更蓝更艳；放大 1.5 倍则每一帧表情都与原片一致。

由此定稿：**SeedVR2 只负责放大 1.5 倍找回细节，剩下的尺寸用本地 lanczos 放大补齐**。表情零失真，服务器耗时只有 3 倍直达的约 1/3（86 秒对 274 秒），观感几乎没有差别。

| 方案 | 表情 | 清晰度 | 5 秒素材耗时 | 结论 |
|------|------|--------|-------------|------|
| 1.5 倍 + 本地放大补齐 | 与原片一致 | 好（略软半分） | 86s + 本地 8s | ★ 推荐 |
| 1.5 倍直出 | 与原片一致 | 好 | 86s | 尺寸不够时用 |
| 3 倍直达 | **被改**：嘴形、眼睛重画 | 略胜半筹 | 274s | 真人脸禁用 |

## 为什么放大会把脸改坏

超分模型补细节时靠训练里学到的「标准样子」来画。脸恰恰是它模板最强、而人眼又最挑剔的部位：放大倍数小（1.5 倍），它只需要少量修补，原表情保得住；放大 3 倍，画面信息缺口太大，它就按「标准笑脸」自由发挥。核心版节点没有「恢复强度」旋钮，色彩校正四档只管颜色不管形状——**放大倍数是模型能画多少的唯一开关**。

三方案同帧脸部对比（核心证据）：[compare_real_face_3way.jpg](compare_real_face_3way.jpg)——左 1.5 倍、中 1.5 倍+本地放大、右 3 倍直达，看右图嘴形与牙齿露出量即可。

## 测试一：真人 cos 素材（544×960 · 124 帧 · 5.17s）

同一素材三条路线各跑一遍，成片后抽同一帧位、裁脸部放大并排逐帧核对：

| 方案 | 输出尺寸 | 表情核对 | 服务器耗时 |
|------|----------|----------|------------|
| A · 1.5 倍直出 | 816×1440 | 与源片一致 | 86.1s |
| B · 1.5 倍 + 本地放大 | 1440×2560 | 与源片一致 | 86.1s + 本地 8s |
| C · 3 倍直达 | 1440×2560 | **被改**：抿嘴→咧嘴露齿，瞳孔重画 | 273.6s |

成片对照：源片 [dance05_source_544.mp4](dance05_source_544.mp4) · A [dance05_15x_816.mp4](dance05_15x_816.mp4) · B [dance05_15x_lanczos_1440.mp4](dance05_15x_lanczos_1440.mp4) · C [dance05_3x_direct_1440.mp4](dance05_3x_direct_1440.mp4)。C 的画质确实略锐一点——但这点收益换不走表情被改的代价。

## 测试二：MMD 卡通素材（704×960 · 724 帧 · 30.2s 全片）

按定稿流程 1.5 倍跑完整片（输出 1056×1440）：

- 画面提升：裙子皮革高光、袖口白纱、黑丝边界各清晰一档，地面光斑轮廓变实（[compare_mmd_full.jpg](compare_mmd_full.jpg)）；
- 脸部：**五官与表情零改动**（[compare_mmd_face.jpg](compare_mmd_face.jpg)）。

意外收获：**卡通素材比拟真素材更适合这套模型**。卡通脸没有「标准真人脸」模板可参照，模型只恢复轮廓和纹理、不去重画表情——拟真素材的失真风险在卡通素材上天然不存在，而 3D 渲染的干净边缘恢复收益反而更大。成片 [mmd_full_15x_1056.mp4](mmd_full_15x_1056.mp4) · 源片 [mmd_source_704.mp4](mmd_source_704.mp4)。

## 落地规则

1. **定稿流程**：SeedVR2 只做 1.5 倍恢复 → 本地 lanczos 拉到交付尺寸。
2. **倍数红线**：真人/拟真素材不超过 1.5 倍；卡通素材同样 1.5 倍起步（收益已够，加倍数只剩风险）。
3. **需要更大尺寸的真人类交付**：换人脸保真专用模型（CodeFormer/GFPGAN 类）单独处理脸部区域，不要整体大倍数直出。
4. **排期口径**：素材秒数 ×15~25（H20 空闲队列实测；人物运动幅度大取上限，因为时间块会被切得更碎）。例：5.17s 素材 86s，30.2s 全片 653.5s。
5. **色彩校正选 lab**：四档差异只在颜色不在形状，lab 肤色最忠实，wavelet 细节略脆。
6. **权重取官方转换**（ModelScope `Comfy-Org/SeedVR2`）：社区镜像缺 2 枚张量会报 "Could not detect model type"；下拉列表能看到文件名不等于能加载。

## 环境与参数（复现用）

- 推理端：局域网 ComfyUI 0.35.0 核心版，SeedVR2 节点链 `SeedVR2Preprocess → VAEEncode → SeedVR2TemporalChunk → Conditioning → KSampler → TemporalMerge → VAEDecode → PostProcessing → SaveVideo`
- 权重：`seedvr2_ema_7b_fp8_e4m3fn.safetensors`（7B fp8）+ `ema_vae_fp16.safetensors`；色彩校正 `lab`
- 采样：1 step · cfg 1.0 · denoise 1.0 · `res_multistep + simple`
- 提交：ComfyUI HTTP API（`POST /prompt` + `/history` 轮询 + `/view` 下载），脚本 `run-seedvr.mjs`（`--clip --target WxH --frames N --name --cc --go`）随实验目录留档
- 评测：ffmpeg 抽同一帧位整帧与脸部裁剪对比图，逐帧核对表情；耗时按墙钟计

## 资产清单

| 文件 | 是什么 |
|------|--------|
| dance05_source_544.mp4 | 测试一源片 |
| dance05_15x_816.mp4 | 方案 A：1.5 倍直出 |
| dance05_15x_lanczos_1440.mp4 | 方案 B：推荐流程 ★ |
| dance05_3x_direct_1440.mp4 | 方案 C：3 倍直达（表情失真对照） |
| compare_real_face_3way.jpg | 三方案同帧脸部对比（核心证据） |
| mmd_source_704.mp4 / mmd_full_15x_1056.mp4 | 测试二源片 / 1.5 倍全片 |
| compare_mmd_full.jpg / compare_mmd_face.jpg | 卡通整帧 / 脸部前后对比 |
| poster_real.jpg / poster_mmd.jpg | 封面帧 |
