# YuE2 Music Generation — Lyrics In, Finished Song Out, Entirely on ComfyUI Native Nodes

[中文](README.md) | English

> Listen: all nine tracks below are end-to-end model generations (vocals + arrangement in one pass), not edited together · 48 kHz / stereo / MP3 320k
> Upstream: [multimodal-art-projection/YuE](https://github.com/multimodal-art-projection/YuE) · Weights: [🤗 Comfy-Org/YuE2](https://huggingface.co/Comfy-Org/YuE2)

## At a glance

YuE2 is an open music-generation model: give it a **style prompt + lyrics**, and it first writes an **editable ABC-notation score** (melody and chords), then renders that score into a full song with vocals and accompaniment. Unlike black-box APIs, the intermediate score is inspectable — you can read it, re-harmonize it, and re-render.

This lab ran 9 songs through **stock ComfyUI nodes** (zero custom plugins), covering big-room EDM, retro disco, piano ballad, Chinese-folk × trap, city pop, tropical house, plus a 45-second duet tailored to a reference photo. Pure generation time per song: roughly 20–40 seconds.

| # | Track | Style | BPM | Length | File |
|---|-------|-------|-----|--------|------|
| 1 | Jin Wan Shi Guang (Tonight Is Light) | Festival Big Room / EDM | 128 | 2:47 | [01-jintian-shiguang-edm.mp3](01-jintian-shiguang-edm.mp3) |
| 2 | Zhuan Ge Quan (Spin Around) | Retro Disco Funk | 116 | 2:54 | [02-zhuangequan-disco.mp3](02-zhuangequan-disco.mp3) |
| 3 | Yi Qian Bian Zaijian (1000 Goodbyes) | Piano Power Ballad | 72 | 3:08 | [03-yiqianbian-goodbye-ballad.mp3](03-yiqianbian-goodbye-ballad.mp3) |
| 4 | Chang'an De Yue (Moon over Chang'an) | Guofeng × Trap | 92 | 2:19 | [04-changan-yue-guofeng-trap.mp3](04-changan-yue-guofeng-trap.mp3) |
| 5 | Haianxian (Coastline Autopilot) | City Pop | 110 | 2:36 | [05-haianxian-citypop.mp3](05-haianxian-citypop.mp3) |
| 6 | Bu Shuo Zaijian (Never-Say-Goodbye Arena) | Tropical House | 104 | 2:42 | [06-bushuizaijian-tropical.mp3](06-bushuizaijian-tropical.mp3) |
| 7 | Yi Dian Dian (A Little Closer) | Photo-tailored duet | 82 | 0:45 | [07-yidiandian-photo-45s.mp3](07-yidiandian-photo-45s.mp3) |
| 8 | Wanfeng Laixin (Letter from the Night Breeze) | Mandopop ballad | 78 | 2:29 | [08-wanfeng-laixin.mp3](08-wanfeng-laixin.mp3) |
| 9 | Wuren Zaichang (Nobody Around) | Orchestral instrumental | 68 | 2:08 | [09-wurenzaichang-instrumental.mp3](09-wurenzaichang-instrumental.mp3) |

## Key findings

1. **Song length follows lyric volume; `max_duration` is only a ceiling.** With the same 190 s cap: a fully loaded 6–8-section ballad rendered 3:08, while a 4-section folk-trap track stopped at 1:42. For ~3 minutes write 24–32 lines; for an exact 45 s keep it to ~8 lines (measured: `max_duration=45` + 8 lines = 45.00 s).
2. **Style prompt formula**: `language + genre + vocal character + BPM + instrumentation + mood/texture`. Keep all musical instructions in Style and only singable text in Lyrics — mixing them pollutes both.
3. **ABC planning modes**: `full` (melody + chords, general default) / `melody` (melody-only plan, free accompaniment — recommended for covers) / off (direct from lyrics+style). In planning modes the score is plain text: edit it by hand and feed it back downstream — that is the white-box editing entry point.
4. **The int8 checkpoint (3.7 GB) is already demo-grade** and VRAM-friendly; a bf16 build sits in the same repo.
5. **Delivery format**: native output is 48 kHz/16-bit FLAC (~6.5 MB/min); for sharing, transcode to MP3 320k (~2.4 MB/min) with ID3 tags so phones play files directly.

## Environment & parameters (for reproduction)

- ComfyUI ≥ 0.37 ships `comfy_extras.nodes_yue2` — **no custom nodes needed**
- Weight: `yue2_3b_int8_convrot.safetensors` in `models/checkpoints/` ([HF](https://huggingface.co/Comfy-Org/YuE2), ModelScope mirror available)
- Node chain: `CheckpointLoaderSimple → YuE2GenerateABC(mode=full) → YuE2GenerateMusic(style, lyrics, abc) → ConditioningZeroOut(negative) → EmptyYuE2LatentAudio(seconds ← upstream) → KSampler(dpm_2 / sgm_uniform / 32 steps / cfg 1.0) → VAEDecodeAudio → SaveAudioAdvanced(flac)`
- ABC sampling: temp 0.7 / top_p 0.9 / top_k 30 / rep-penalty 1.005; music-token sampling: temp 1.0 / top_p 0.95 / top_k 100 / rep-penalty 1.2
- Official template workflow: `Text to Music (YuE2)` (audio_yue2_text2music)

## License note

Code and workflows are Apache-2.0; **model weights are CC BY-NC 4.0 with an additional creator permission**: free for personal creation and monetized content, free for non-commercial academic use, **companies need a separate commercial license from upstream**. Crediting YuE2 when sharing generated songs is encouraged.
