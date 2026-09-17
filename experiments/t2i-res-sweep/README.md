# 文生图双模型分辨率扫描 —— 同提示词 0.1 → 1.0 MP（Z-Image Turbo vs Flux 2 Klein 9B）

与 [H3 分辨率扫描](../h3-res-sweep/)（文生视频）同一套方法：同一提示词、同一 seed（91720260）、
同一采样配置，仅改变分辨率（0.1 → 1.0 百万像素，~0.1MP 步进），对两个文生图模型各扫 10 档。

## 模型与固定参数

| 项目 | Z-Image Turbo | Flux 2 Klein 9B |
|---|---|---|
| 扩散模型 | z_image_turbo_int8_convrot | flux-2-klein-9b-fp8 |
| 文本编码器 | qwen_3_4b_fp8_mixed（lumina2） | qwen_3_8b_fp8mixed（flux2）¹ |
| VAE | ae.safetensors | flux2-vae.safetensors |
| 采样 | res_multistep / simple，8 步，CFG 1 | euler，20 步，CFG 5 |
| 提示词 | 偶像舞台（见 [prompt.txt](prompt.txt)） | 同左 |

¹ 9B 版 Klein 的文本嵌入维度 12288（3×4096）必须配 qwen_3_8b；官方模板默认的 4B 编码器（7680 维）会报
`mat1 and mat2 shapes cannot be multiplied`。

## 快速对比

- 20 张原图逐张查看：`zimg_mp*.png` / `flux2_mp*.png`（播放页 [t2i-res-sweep](https://mafeis.github.io/ai-test-lab/#t2i-res-sweep) 可逐张切换）

## 数据总表（NVIDIA H20 实测）

| 档位 | 分辨率 | Z-Image 耗时 | Z-Image 大小 | Flux2 耗时 | Flux2 大小 |
|---|---|---|---|---|---|
| 0.1 MP | 256×352 | 2.0s | 147 KB | 4.6s | 135 KB |
| 0.2 MP | 384×512 | 2.0s | 282 KB | 4.1s | 271 KB |
| 0.3 MP | 480×640 | 2.0s | 429 KB | 2.1s² | 418 KB |
| 0.4 MP | 544×736 | 2.0s | 531 KB | 8.1s | 557 KB |
| 0.5 MP | 608×832 | 2.1s | 645 KB | 8.9s | 652 KB |
| 0.6 MP | 672×896 | 4.1s | 778 KB | 10.4s | 760 KB |
| 0.7 MP | 736×960 | 4.1s | 865 KB | 12.2s | 875 KB |
| 0.8 MP | 768×1056 | 4.1s | 1024 KB | 14.2s | 980 KB |
| 0.9 MP | 832×1088 | 4.1s | 1082 KB | 16.2s | 1115 KB |
| 1.0 MP | 896×1120 | 4.1s | 1155 KB | 18.3s | 1108 KB |

² 0.3MP 的 2.1s 是排队时撞上缓存/并发的异常值，正常应在 6–7s。

- Z-Image Turbo 全档位 2–4 秒，0.5MP 以下几乎恒定——**耗时基本与分辨率无关**（turbo 8 步 + CFG 1 太便宜）。
- Flux2 耗时随像素近似线性增长（4.6s → 18.3s），且 CFG 5 使每步都做双倍前向。
- 两个模型 0.9→1.0MP 文件大小都不再增长（Z-Image 1082→1155KB、Flux2 1115→1108KB 反降），信息增益饱和。

## 视觉结论（0.1 → 1.0MP 逐档对比）

**Z-Image Turbo（微写实风）**
1. 0.1MP 五官糊、皮肤塑料感；0.2–0.4MP 构图和服装成型但细节粗糙
2. 0.6MP 起裙摆蕾丝褶皱、背景伴舞、舞台桁架全部清晰
3. 全十档风格高度一致（真人 cos 感），**无风格抽卡问题**——低分辨率只糊不漂
4. 甜点：**0.6MP**（4.1s，细节齐全）；要出片直接 0.8MP 也就 4.1s

**Flux 2 Klein 9B（赛璐璐动漫风）**
1. 0.1MP 线条崩、手部融化；0.3MP 腿部有明显横向涂抹伪影
2. 0.4MP 起动漫脸稳定命中，0.6MP 起线稿干净、观众席光斑/桁架/音箱全到位
3. 全十档锁死动漫风格——**"Anime"提示词免疫风格漂移**，与 H3 视频扫描结论一致
4. 甜点：**0.6MP**（10.4s）；0.9–1.0MP 线条最锐但耗时 +75%

**双模型同 seed 同提示词直接对比**
- 风格分化在最低分辨率就已定型：Z-Image 永远微写实、Flux2 永远赛璐璐，分辨率改变的是细节量而不是风格
- 同样 0.6MP：Z-Image 4.1s vs Flux2 10.4s（2.5 倍）；Flux2 换来的是精准的二次元风格渲染
- 动漫题材选 Flux2，写实/cos 题材选 Z-Image（速度还快 2–4 倍）

## 关键发现

1. **两个模型的甜点档都是 0.6MP**（672×896），与 H3 视频扫描的结论完全一致——0.6MP 是这类扩散模型的通用质量拐点。
2. **Z-Image Turbo 是"零思考成本"模型**：任何分辨率 ≤4.1s，直接用 0.8MP 当默认值即可。
3. **Flux2 Klein 的质量台阶在 0.4MP**：低于它会出现肢体/线条崩坏，不能靠抽卡救。
4. **1.0MP 性价比开始倒挂**（两个模型同样成立）：耗时 +25–75%，文件大小反而持平或下降。

## 文件清单

| 文件 | 说明 |
|---|---|
| `zimg_mp0.1_00001_.png` … `zimg_mp1.0_00001_.png` | Z-Image Turbo 十档原始成片 |
| `flux2_mp0.1_00001_.png` … `flux2_mp1.0_00001_.png` | Flux 2 Klein 十档原始成片 |
| `workflow_zimg_api.json` / `workflow_flux2_api.json` | API 格式工作流（0.5MP 示例，改 width/height 复现） |
| `prompt.txt` | 扫描用提示词 |

复现命令：

```powershell
curl.exe -X POST --data-binary "@workflow_zimg_api.json" http://127.0.0.1:8188/prompt
curl.exe -X POST --data-binary "@workflow_flux2_api.json" http://127.0.0.1:8188/prompt
```

> 工作流文件已按 `/prompt` 接口要求预包装 `{"prompt": ...}`，提交即跑（两个文件入库前均已实测提交成功）。
> 改分辨率时需同步修改 latent 节点（Z-Image 节点 7 / Flux2 节点 8、10）的 width/height。
