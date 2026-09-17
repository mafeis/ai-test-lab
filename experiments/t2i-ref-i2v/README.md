# 文生图甜点图 → H3 图生视频 —— 双参考图 × 0.4/0.6MP（5s 含原生音频）

本实验是 [t2i-res-sweep](../t2i-res-sweep/) 的下游验证：把两个文生图模型各自 0.6MP（672×896）甜点图
作为 **MiniMax H3 图生视频（fl2va）的首帧参考图**，同提示词、同 seed（91720260）、同采样配置
（turbo 8-step / res_multistep / simple，124 帧 = 5.17s @24fps，含 H3 原生音频），
分别在 0.4MP（544×736）和 0.6MP（672×896）两档生成视频，共 4 条。

## 生成矩阵

| 参考图（来源） | 0.4MP 544×736 | 0.6MP 672×896 |
|---|---|---|
| Z-Image Turbo 甜点图（微写实） | [t2iref_zimg_mp0.4_00001_.mp4](t2iref_zimg_mp0.4_00001_.mp4) · 70.4s | [t2iref_zimg_mp0.6_00001_.mp4](t2iref_zimg_mp0.6_00001_.mp4) · 125.7s |
| Flux 2 Klein 9B 甜点图（动漫） | [t2iref_flux2_mp0.4_00001_.mp4](t2iref_flux2_mp0.4_00001_.mp4) · 70.4s | [t2iref_flux2_mp0.6_00001_.mp4](t2iref_flux2_mp0.6_00001_.mp4) · 125.6s |

参考图原件：[ref_zimg_mp0.6.png](ref_zimg_mp0.6.png) · [ref_flux2_mp0.6.png](ref_flux2_mp0.6.png)

## 观察（逐条看）

1. **风格完全跟随参考图**：Z-Image 参考图出的视频是真人 cos 感，Flux2 参考图出的是赛璐璐动漫——
   H3 忠实继承首帧风格，提示词不改变风格归属（与 t2i 扫描结论互相印证）
2. **0.4MP → 0.6MP 视频档的提升主要在背景**：人物主体两档都稳，0.6MP 档舞台桁架、观众席光斑、
   蕾丝裙摆纹理明显更清晰
3. **角色一致性很好**：双马尾、水手服、配色全程保持，无换脸/服装漂移
4. **同 seed 同提示词下，两条 0.6MP 的运镜和舞步节奏与参考图构图强相关**——首帧决定镜头起点

## 数据

| 条目 | 生成耗时（H20） | 大小 |
|---|---|---|
| zimg 0.4MP | 70.4s | 1273 KB |
| zimg 0.6MP | 125.7s | 1894 KB |
| flux2 0.4MP | 70.4s | 2009 KB |
| flux2 0.6MP | 125.6s | 2778 KB |

耗时只随视频分辨率变化（70s → 126s，与 t2v 扫描一致），参考图来源不影响速度。

## 文件清单

| 文件 | 说明 |
|---|---|
| `t2iref_{zimg,flux2}_mp{0.4,0.6}_00001_.mp4` | 4 条成片（5.17s @24fps，含原生 AAC 音频） |
| `ref_zimg_mp0.6.png` / `ref_flux2_mp0.6.png` | 两张首帧参考图（0.6MP 甜点原图） |
| `workflow_h3_i2v_ref_api.json` | API 格式工作流（zimg 参考图 + 0.6MP 示例，提交即跑） |

复现：先把参考图上传 `curl.exe -F "image=@ref_zimg_mp0.6.png" http://127.0.0.1:8188/upload/image`，再
`curl.exe -X POST --data-binary "@workflow_h3_i2v_ref_api.json" http://127.0.0.1:8188/prompt`
（换参考图改节点 6 的 image，换视频档位改节点 7 的 width/height，均需 32 的倍数）。
