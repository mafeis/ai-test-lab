# YuE2 音乐生成 —— 歌词进、成品歌出，ComfyUI 原生节点全链路

中文 | [English](README.en.md)

> 在线试听：本页九首均为模型端到端生成（人声 + 编曲一体），非剪辑拼接 · 全部 48 kHz / 立体声 / MP3 320k
> 上游项目：[multimodal-art-projection/YuE](https://github.com/multimodal-art-projection/YuE) · 权重：[🤗 Comfy-Org/YuE2](https://huggingface.co/Comfy-Org/YuE2)

## 一分钟看懂

YuE2 是开源音乐生成模型：给它**风格描述 + 歌词**，它先写出一份**可编辑的 ABC 乐谱**（旋律+和弦），再把乐谱渲染成带人声和伴奏的完整歌曲。与黑盒 API 类产品的差别在于「白盒」：中间那份乐谱可以拿出来看、改和弦、再重新渲染。

本实验用 **ComfyUI 原生节点**（无需任何第三方插件）跑了 9 首歌，覆盖 DJ 大场、复古迪斯科、抒情芭乐、中国风×Trap、City Pop、热带浩室等风格，外加一首按照片气质定制的 45 秒对唱小品。单首纯执行时间约 20–40 秒。

| # | 曲目 | 风格 | BPM | 时长 | 文件 |
|---|------|------|-----|------|------|
| 1 | 今晚是光 | Festival Big Room / EDM | 128 | 2:47 | [01-jintian-shiguang-edm.mp3](01-jintian-shiguang-edm.mp3) |
| 2 | 转个圈 | Retro Disco Funk | 116 | 2:54 | [02-zhuangequan-disco.mp3](02-zhuangequan-disco.mp3) |
| 3 | 一千遍再见 | Piano Power Ballad | 72 | 3:08 | [03-yiqianbian-goodbye-ballad.mp3](03-yiqianbian-goodbye-ballad.mp3) |
| 4 | 长安的月 | 中国风 × Trap | 92 | 2:19 | [04-changan-yue-guofeng-trap.mp3](04-changan-yue-guofeng-trap.mp3) |
| 5 | 海岸线自动驾驶 | City Pop | 110 | 2:36 | [05-haianxian-citypop.mp3](05-haianxian-citypop.mp3) |
| 6 | 不说再见的主场 | Tropical House | 104 | 2:42 | [06-bushuizaijian-tropical.mp3](06-bushuizaijian-tropical.mp3) |
| 7 | 一点点 | 照片定制 · 对唱 | 82 | 0:45 | [07-yidiandian-photo-45s.mp3](07-yidiandian-photo-45s.mp3) |
| 8 | 晚风来信 | 中文流行抒情 | 78 | 2:29 | [08-wanfeng-laixin.mp3](08-wanfeng-laixin.mp3) |
| 9 | 无人在场 | 纯器乐管弦 | 68 | 2:08 | [09-wurenzaichang-instrumental.mp3](09-wurenzaichang-instrumental.mp3) |

## 关键经验

1. **时长由歌词体量决定，`max_duration` 只是上限**。同样设 190s：歌词写满 6–8 段的抒情曲出了 3:08，只写 4 段的中国风只出 1:42。要 ~3 分钟就写满 24–32 行；要精确 45 秒就控制 8 行左右（实测 `max_duration=45` + 8 行歌词 = 45.00s 命中）。
2. **Style 提示词公式**：`语言 + 流派 + 人声特点 + BPM + 乐器编制 + 氛围质感`。把音乐指令全部放 Style，歌词字段只放要唱的词，两者混写会互相污染。
3. **ABC planning 三档**：`full`（旋律+和弦规划，通用推荐）/ `melody`(只用旋律、伴奏自由，翻唱推荐) / 关闭（直接从歌词+风格生成）。规划模式下乐谱输出是纯文本，可以人工改完再接回下游节点——这就是白盒编辑入口。
4. **int8 量化权重（3.7 GB）质量已足够商用演示**，且显存占用友好；bf16 版本同仓库可取。
5. **交付格式**：模型直出 48 kHz/16bit FLAC（≈6.5 MB/分钟），分享场景转 MP3 320k（≈2.4 MB/分钟）并写入 ID3 标签，手机端即点即播。

## 环境与参数（复现用）

- ComfyUI ≥ 0.37 核心版自带 `comfy_extras.nodes_yue2`，**无需自定义节点**
- 权重：`yue2_3b_int8_convrot.safetensors` 放 `models/checkpoints/`（[HF](https://huggingface.co/Comfy-Org/YuE2) / ModelScope 同名仓库）
- 节点链：`CheckpointLoaderSimple → YuE2GenerateABC(mode=full) → YuE2GenerateMusic(style, lyrics, abc) → ConditioningZeroOut(负向) → EmptyYuE2LatentAudio(seconds←上游) → KSampler(dpm_2 / sgm_uniform / 32步 / cfg 1.0) → VAEDecodeAudio → SaveAudioAdvanced(flac)`
- ABC 采样参数：temp 0.7 / top_p 0.9 / top_k 30 / rep penalty 1.005；音乐 token 采样：temp 1.0 / top_p 0.95 / top_k 100 / rep penalty 1.2
- 官方模板工作流：`Text to Music (YuE2)`（audio_yue2_text2music）

## 许可提醒

代码与工作流 Apache-2.0；**模型权重 CC BY-NC 4.0 + 创作者附加条款**：个人创作与内容变现免费、学术非商业免费，**公司商用需向上游另取授权**。分享生成的歌曲建议注明 YuE2。
