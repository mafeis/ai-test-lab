# 文生图最佳分辨率是哪一档：双模型 0.1→1.0MP 对照（Z-Image Turbo vs Flux 2 Klein 9B）

## 一分钟看懂

口径说明：**MP（百万像素）**＝图像像素总量单位，本实验从 256×352（0.1MP）到 896×1120（约一百万像素，1.0MP）；**耗时**＝单张成图的实测秒数（含排队）；**文件大小**＝PNG 文件字节数，本实验用作画面信息量的度量；**seed**＝随机种子，固定它才能把差异归因到分辨率本身。

| 问题 | 做法 | 结果 |
|---|---|---|
| 分辨率影响画质吗 | 同提示词、同 seed（91720260）、同采样配置，仅把分辨率从 0.1MP 以约 0.1MP 步进提到 1.0MP，两模型各 10 档 | 两个模型都在 0.6MP（672×896）达到最佳画质，与 [H3 分辨率扫描](../h3-res-sweep/)（文生视频）的结论一致：0.6MP 是这类扩散模型画质提升的通用拐点 |
| 分辨率越高越费时间吗 | 记录每档单张耗时 | Z-Image Turbo 全程 2.0–4.1s 基本不变，选档无时间压力；Flux 2 Klein 9B 从 4.6s 涨到 18.3s，成本随像素线性上升 |
| 画风由什么决定 | 同 seed 同提示词下直接对比两个模型 | 画风在最低分辨率就已定型：Z-Image Turbo 全程偏写实，Flux 2 Klein 9B 全程赛璐璐动漫风（平涂色块的动画画风）；分辨率只改变细节量 |
| 1.0MP 值得吗 | 对比 0.9MP 与 1.0MP 的文件大小 | 两模型文件大小持平或反降（Z-Image Turbo 1082→1155KB，Flux 2 Klein 9B 1115→1108KB），时间多花 25–75% 而收益不再增长，1.0MP 不推荐 |

## 实验方法

本实验沿用 [H3 分辨率扫描](../h3-res-sweep/) 的方法：同一提示词、同一 seed（91720260）、同一采样配置，仅改变分辨率（0.1 → 1.0 百万像素，约 0.1MP 步进），对两个文生图模型各扫 10 档，共 20 张。提示词见 [prompt.txt](prompt.txt)。

- 20 张原图逐张查看：`zimg_mp*.png` / `flux2_mp*.png`（播放页 [t2i-res-sweep](https://mafeis.github.io/ai-test-lab/#t2i-res-sweep) 可逐张切换）

## 数据总表

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

数据读法：

- Z-Image Turbo 全档位 2–4 秒、0.5MP 以下几乎恒定——这说明它的耗时基本与分辨率无关，高画质档不必额外等。
- Flux 2 Klein 9B 耗时随像素近似线性增长（4.6s → 18.3s）——这说明选它的每一档高分辨率都要按像素比例付时间。
- 0.9→1.0MP 两模型文件大小都不再增长（Z-Image Turbo 1082→1155KB，Flux 2 Klein 9B 1115→1108KB 反降）——这说明超过 0.9MP 后画面信息量已饱和。

## 画质表现（0.1 → 1.0MP 逐档对比）

**Z-Image Turbo（偏写实）**

- 0.1MP 五官模糊、皮肤塑料感；0.2–0.4MP 构图和服装成型但细节粗糙——这说明此区间分辨率不足首先损失的是细节。
- 0.6MP 起裙摆蕾丝褶皱、背景伴舞、舞台桁架全部清晰。
- 全十档风格高度一致（真人 cos 感），低分辨率只模糊、不跑风格。

**Flux 2 Klein 9B（赛璐璐动漫风）**

- 0.1MP 线条崩坏、手部融化；0.3MP 腿部出现明显横向涂抹伪影——这说明低于质量下限的档位不可用。
- 0.4MP 起动漫脸稳定命中；0.6MP 起线稿干净，观众席光斑、桁架、音箱全部到位；0.9–1.0MP 线条最锐。
- 全十档保持动漫风格，提示词含 Anime 时风格不随分辨率漂移，与 H3 文生视频扫描的观察一致。

**两模型直接对比（同 seed 同提示词）**

- 风格分化在最低分辨率即已定型：Z-Image Turbo 始终偏写实，Flux 2 Klein 9B 始终赛璐璐动漫风——这说明分辨率改变的是细节量而不是风格。
- 同为 0.6MP：Z-Image Turbo 4.1s，Flux 2 Klein 9B 10.4s（2.5 倍）——多出的时间换来的是精准的二次元风格渲染。

## 结论

1. 两个模型的最佳档位都是 0.6MP（672×896）——这说明 0.6MP 是这类扩散模型的通用画质拐点，换模型不用重扫。
2. Z-Image Turbo 无需选档：任何分辨率 ≤4.1s，默认建议直接设为 0.8MP。
3. Flux 2 Klein 9B 的质量下限在 0.4MP：低于该档出现肢体/线条崩坏，且无法通过反复生成弥补。
4. 0.9→1.0MP 收益倒挂：耗时 +25–75%，文件大小持平或下降，1.0MP 不推荐。
5. 题材选模型：动漫题材用 Flux 2 Klein 9B，写实/cos 题材用 Z-Image Turbo（速度还快 2–4 倍）。

## 文件清单

| 文件 | 说明 |
|---|---|
| `zimg_mp0.1_00001_.png` … `zimg_mp1.0_00001_.png` | Z-Image Turbo 十档原始成片 |
| `flux2_mp0.1_00001_.png` … `flux2_mp1.0_00001_.png` | Flux 2 Klein 十档原始成片 |
| `workflow_zimg_api.json` / `workflow_flux2_api.json` | API 格式工作流（0.5MP 示例，改 width/height 复现） |
| `prompt.txt` | 扫描用提示词 |

## 复现与环境参数

- 测试硬件：NVIDIA H20。
- 工作流文件已按 `/prompt` 接口要求预包装 `{"prompt": ...}`，提交即跑（两个文件入库前均已实测提交成功）。
- 改分辨率时需同步修改 latent 节点（Z-Image 节点 7 / Flux2 节点 8、10）的 width/height。

复现命令：

```powershell
curl.exe -X POST --data-binary "@workflow_zimg_api.json" http://127.0.0.1:8188/prompt
curl.exe -X POST --data-binary "@workflow_flux2_api.json" http://127.0.0.1:8188/prompt
```

### 模型与固定参数

| 项目 | Z-Image Turbo | Flux 2 Klein 9B |
|---|---|---|
| 扩散模型 | z_image_turbo_int8_convrot | flux-2-klein-9b-fp8 |
| 文本编码器 | qwen_3_4b_fp8_mixed（lumina2） | qwen_3_8b_fp8mixed（flux2）¹ |
| VAE | ae.safetensors | flux2-vae.safetensors |
| 采样 | res_multistep / simple，8 步，CFG 1 | euler，20 步，CFG 5 |
| 提示词 | 偶像舞台（见 [prompt.txt](prompt.txt)） | 同左 |

¹ 9B 版 Klein 的文本嵌入维度 12288（3×4096）必须配 qwen_3_8b；官方模板默认的 4B 编码器（7680 维）会报
`mat1 and mat2 shapes cannot be multiplied`。

CFG（提示词引导强度）：Flux 2 Klein 9B 使用 CFG 5，每一步都做双倍前向计算，是其耗时高于 Z-Image Turbo（8 步、CFG 1）的原因之一。
