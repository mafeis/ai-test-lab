# Test log: Hermes + Qwen3.8-Flash builds a Blender Hatsune Miku model and a dance video all on its own

[中文](README.md) | English

> Test date: 2026-09-17 · Log written: 2026-09-17 · Environment and full settings: see "Reproduction Environment and Parameters" at the end.

## The one-minute version

| Question | Approach | Result |
|---|---|---|
| With no human hands involved, can an AI build a Hatsune Miku model in Blender on its own and render a dance video of about 30 seconds? | The agent CLI Hermes, running the thinking model Qwen3.8-Flash, got only 3 effective instructions (originals in the "Input Instructions" section below). Everything else was done autonomously: procedural modeling, look-and-fix self-review, rigging, choreography, procedural music, render and compositing | Success: zero human intervention end to end; the model passed all 6 render acceptance rounds; the final cut is exactly 30.000 seconds, 720×960 @24fps, H.264+AAC, 5.0 MB |

## 1. Test goal

Answering one question: can an agent CLI (Hermes) driving the thinking model **Qwen3.8-Flash (reasoning effort=xhigh, the top level)** complete, with **zero human intervention** and only two natural-language instructions, the full 3D animation pipeline: procedural modeling in Blender, multi-round visual self-review and fixes, rigging, choreography, procedural music, and render/compositing.

Three terms used throughout this log, defined up front:

- **token**: the unit for measuring model input/output text. Used here to weigh workload.
- **message**: one exchange entry in the session. Used here to size the session.
- **Visual self-check (vision_analyze)**: a tool call that sends a rendered image back to the model so it can point out flaws the way a human eye would.

## 2. Input instructions

All user input: 3 effective instructions.

```
1. Use blender to make a high-detail model of Hatsune Miku  wearing something breezy
2. continue
3. Final acceptance: once it passes and you're sure the model is high quality, make a dancing video, about 30s
(One follow-up at the end: what is the path of this video?)
```

No reference images, model files, or storyboard requirements were given. The agent designed everything itself. What this means: final quality depends entirely on the model's own task breakdown and self-checking. The instructions carry no professional production knowledge.

## 3. How it ran

### 3.1 Procedural modeling: 6 render acceptance rounds

1. Followed the skill workflow to write a procedural modeling script: an anime-proportioned doll, the signature green twin tails, a sleeveless breezy outfit, with output verified in Cycles (Blender's high-fidelity render engine).
2. First attempt hit an out-of-memory crash (OOM: memory exhausted, process killed by the system). A voxel size of 0.008 (the edge length of the small cubes when a mesh is rebuilt as a blocky structure; smaller is finer but costs more memory) on a heavy mesh, plus second-level subdivision, blew the mesh up to 258MB and filled the 16GB RAM. The process got SIGKILLed (exit code 137). The AI then lowered mesh precision on its own (exact values in the parameter table at the end) and turned on GPU acceleration (Metal), and it ran; the mesh shrank from 258MB to 64MB. What this means: on a constrained machine like a 16GB one, "lower precision, get it running" beats "insist on the original parameters and never get it running".
3. Visual self-check and fixes, round by round:
   - Rounds 2–3: the headphone band hung in front of the face, hair ties pointed the wrong way, skirt ribs poked through, exposure too strong (fixed by switching the color scheme; scheme name at the end).
   - Round 4: center-parted bangs exposed the forehead, the tie floated, a floating ring between skirt and boots.
   - Rounds 5–6: added a solid bangs plate, precise to the brow line so it doesn't cover the eyes; final result **6/6 PASS** (all 6 acceptance rounds passed).

   All 6 acceptance rounds were driven by the AI's "look — fix — re-render" loop, with no human QC. This is the key mechanism that makes the test work.

### 3.2 The dance video (30 seconds)

1. **6-frame preview first**: validated rig and choreography on 6 frames before committing to the full 720-frame render. What this means: keep the trial-and-error cost on preview frames, not on the whole film.
2. Choreography in 8 sections, all aligned to 128 BPM (beats per minute): bounce warm-up → wave arms → side step with arm swings → groove and point → double jump → 360° spin (tails swing out with centrifugal force) → grapevine step + claps → V-shape freeze pose.
3. Motion implementation: rigid-body hierarchy driven by Empty bone chains (an empty object as the parent controlling a bone chain), twin tails swung by spring physics as the body moves, 720 keyframes across the whole film (keyframe: pin a pose at a given moment, the software fills in the middle).
4. BGM synthesized procedurally: waveforms generated straight from code, no off-the-shelf track. Chord progression Am-F-C-G electro-pop at 128 BPM, aligned with the choreography (loudness settings at the end).
5. Rendering: EEVEE (Blender's real-time render engine) outputs 720×960 @24fps at about 0.7 seconds/frame; ffmpeg composites the H.264+AAC final cut.

### 3.3 Render crashes and self-repair (3 times)

| Problem | Self-repair |
|---|---|
| Render end frame (frame_end) left unset, so only 250 frames rendered by default | Noticed it, then rendered 251–720 to fill the gap |
| The fill-in batch's filenames got polluted by the `%04d` template, producing 471 dirty frames | Threw out the whole batch, switched to the `####` template |
| Scene `frame_end=250` clamped the re-render again | Dropped patch-style fixes; one clean full re-render of all 720 frames |

All 3 crashes were found, diagnosed, and fixed by the AI itself, and all came from the "fill-in render" step. What this means: one clean full re-render beats several patched fill-in renders.

## 4. Cost

| Item | Value | What this tells us |
|---|---|---|
| Session | Hermes session `20260917_002811_81a2e0` (desktop entry), 227 messages in total | Only 3 of them were real user instructions; everything else was the agent's own execution and self-checks |
| Token cost | Input 530,454 / output 108,723 (thinking 62,888) | The bulk sits on the input side, because render images and other material kept going back to the model for checking; thinking is more than half of the output, so "think first, act after" took a real investment |

**Tool call stats** (108 calls in total):

| Tool | Count | Purpose |
|---|---|---|
| terminal | 35 | Ran Blender renders and ffmpeg compositing in the background |
| process_manage | 21 | Managed long background render processes |
| execute_code | 21 | Ran Python (modeling scripts, BGM synthesis) |
| vision_analyze | 19 | Pulled render images for self-check (the core QC tool) |
| patch | 5 | Fixed script defects |
| write_file / read_file / skill_view etc. | 7 | File and skill management |

19 of the 108 calls were visual self-checks: with no human QC, "looking at images" is the most frequent action besides running commands, and the 6-round acceptance loop rests on it.

## 5. Deliverables

| File | Size | Notes |
|---|---|---|
| `images/miku_dance.mp4` | 5.0 MB | **Final cut**: 30.000s, 720×960@24fps, H.264+AAC (click the [cover](../images/miku_dance_poster.png) to watch) |
| `miku.blend` (kept off this machine) | 89 MB | Source file of the standing model |
| `miku_dance.blend` (kept off this machine) | 504 KB | Contains the 720 frames of motion keyframes |
| `bgm.wav` (kept off this machine) | 5.0 MB | Procedurally synthesized soundtrack |
| `frames/0001–0720.png` (kept off this machine) | — | Per-frame renders |

The final cut's duration, codec, and size match the in-session report exactly, so deliverable and report agree with no drift. This video was later used as the original version for the [H3 image-to-video optimization experiment](../docs/miku-dance-optimize.md).

## 6. Conclusion

**Success**: two instructions, zero human intervention, and the agent ran the whole pipeline on its own: modeling → fixing → rigging → choreography → music → render/compositing.

Key lessons (the numbers and process behind each are in the sections above, not repeated here):

1. Visual self-check (vision_analyze) is the core of unattended QC: with no human gate, the "look — fix — re-render" loop can replace human acceptance.
2. Preview first, then go full (check a few preview frames before rendering the whole film) saves a lot of trial-and-error cost.
3. On a memory-constrained machine hit by OOM, rerunning at lower precision beats grinding on parameters.
4. One clean full re-render beats several fill-in renders: every crash this round came from the fill-in render step.
5. The same model judged differently through a different entry point, worth cross-testing (see below).

### Extra finding: same prompt, different entry, inconsistent safety judgment

With the same prompt through the api_server entry, in another session, the model **refused outright** on the "breezy outfit" direction (Miku's official setting is 16 years old) and said procedural modeling can't reach "high detail"; the desktop session read the task as a stylized doll in a sleeveless breezy outfit and executed it successfully. What this means: the entry channel changes the same model's safety judgment and task execution, so when evaluating a model's capability, different entries should not be treated as equivalent.

## 7. Reproduction environment and parameters

| Item | Value | Notes |
|---|---|---|
| Machine | Mac mini M2, 16GB RAM, macOS 26.6.2 | The OOM and the precision-lowering strategy both happened under this memory cap |
| Agent and entry | Hermes desktop entry (api_server entry as the control group, see the extra finding) | — |
| Model | Qwen3.8-Flash (provider `custom:hankun`, chat_completions) | — |
| Thinking config | `reasoning: enabled, effort=xhigh` | Top thinking level |
| Service tier | priority | — |
| Working directory | `/Users/mac/miku_model/` | Directory for modeling, rendering, and compositing intermediates |
| Execution mode | Blender 5.2 headless (`--background --python`) background tasks × multiple rounds | The Blender GUI never opens; scripts drive everything |
| Modeling fallback params | voxel 0.008 → 0.014–0.018; subdivision level 2 → 1; 64 samples | The 0.008 setting triggered OOM; the fallback got it running |
| Render speedup and color | Metal GPU enabled; over-exposure fixed by switching to the AgX color scheme | AgX used to tame blown highlights |
| Render engine and spec | EEVEE, 720×960 @ 24fps, about 0.7 s/frame | The real-time engine met this round's quality bar |
| Compositing | ffmpeg outputs H.264+AAC | — |
| Frame filename template | `####` (dropped `%04d`, reason in 3.3) | Avoids fill-in render filename pollution |
| BGM loudness | tanh soft limiter + normalize to 0.88 | Keeps peak loudness down, avoids clipping |
