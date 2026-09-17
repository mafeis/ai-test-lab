# Making Miku's 30s Stage Mini-Play 'Encore' (Cel-Shaded Anime Style · One Unified BGM)

[中文](README.md) | English

This uses the best pipeline verified in [t2i-res-sweep](../t2i-res-sweep/) and [h3-round2](../h3-round2/) to make our first **fully narrative** cut: 6 shots, each 5.17s, 31.0s in total (24fps, i.e. 24 frames per second; 672×896 vertical). The final 31.0s means all 6 shots made it in complete, with no content cut. One continuous BGM track runs across the whole film.

## The one-minute version

| Question | Approach | Result |
|---|---|---|
| How do 6 clips of 5s each become one coherent story? | Adjacent shots share one keyframe: the last frame of a shot = the first frame of the next (the same image) | Zero jump at the seams; the shot 1→2 change is a deliberate "curtain up" cut |
| Why do anime frames drift toward photoreal as you chain them, and how do you stop it? | Regenerate a cel keyframe at both the start and the end of every shot to lock the style (dual anchor on first and last frame); never feed a shot's raw last frame into the next | v1 approach: 5 of 6 shots drifted to photoreal; v2 dual anchor: 0 shots drifted |
| How does the 30s background music never break? | Drop the single looped BGM bed; time-shift and align each shot's own native audio track | Full loudness from 0s; the loudness gap at the 5 audio seams is ≤0.2 dB, inaudible jumps |

## Storyboard for 'Encore'

| Shot | Time | Story | Where the last frame lands |
|---|---|---|---|
| 1 | 0-5s | Standing eyes-closed in the dark wings; the top light comes on; she opens her eyes and smiles | Full-body smile in the light |
| 2 | 5-10s | The music bursts open; she dances and spins on stage, skirt flaring out | Mid-spin pose |
| 3 | 10-15s | The leap - the climax; twin tails whipping, light flares bursting | Arms spread mid-air |
| 4 | 15-20s | Slow fall, a look back over the shoulder, a smile at the camera, camera pushes in | Close-up |
| 5 | 20-25s | She reaches a hand out to the camera; the audience's light sticks sway like a sea | Hand reaching toward the camera |
| 6 | 25-30s | Lights close in; she bows and winks; lights out, just a silhouette | Ends on a dark silhouette |

## Style consistency: one failure and its fix

**The v1 lesson (using the previous shot's raw last video frame as the next shot's first frame)**: shot 1 kept the cel anime style, but shots 2-6 all drifted into live-action cosplay - 5 of the 6 shots failed. The reason: the H3 video model gradually renders an anime first frame into photoreal texture during its 5-second generation (the continuous version of the "style lottery" seen in the resolution-sweep experiment). This chaining passes more than the character to the next shot - it also passes the already-drifted style.

**The v2 fix (dual anchor on first and last frame)**: reset the style anchor for every shot - lock each shot's start and end with a Flux2-generated cel keyframe. H3's pull toward realism is trapped between the two anchors and can no longer build up shot over shot.

**v2 spot checks across the film**: all 6 check points (t=2.5/8/13/18/23/28s, including each shot's middle frame) are pure cel style with zero drift - the fix works.

- shot1→2: dark wings to full stage light - a deliberate "curtain up" hard cut, not a defect.
- shot2→3→4→5→6: adjacent shots share the same Flux2 keyframe (the last frame of a shot = the first frame of the next), zero jump at the seams.
- Character consistency: twin tails, sailor uniform, gold buttons, headphones - all 4 features match across all 6 shots, no drift.

## Audio design: three iterations (v2 / v3 / v4)

dB is the unit of loudness - the more negative, the quieter; RMS is the root-mean-square of loudness, i.e. "how full the sound is." The table below and all measurements use these definitions.

| Version | Approach | Result |
|---|---|---|
| v2 | Loop shot 3's BGM as a 31s bed | Fail: the same phrase hard-restarts every 5s (loudness drops 50% at each boundary), and the first 4s are near-silent - the main cause of the "broken" feel |
| v3 | Concatenate each shot's native audio track directly | Fail: shot 1's native track is near-silent (-80dB, barely audible), so the first 5s have no sound |
| **v4 (final)** | **Shift aud2-6 by one into alignment + close with aud2** | **Pass**: full loudness from 0s; the RMS of all 6 segments sits in the -15.2 ~ -13.9dB band, i.e. the BGM volume is consistent across segments; **all 5 seams are fully continuous in RMS** |

Why v4 works: each shot's native audio track is an independent render of the same prompt (J-pop dance track), so the energy matches naturally (-14dB±1, i.e. segment volumes stay within 1 dB of each other). Time-shifting aud2-6 by one position aligns the music to each shot's range - the music "starts its phrase" one shot ahead of the picture, so the seams land right on phrase changes: it sounds like sections moving forward, not a tape jump. Zone 6 reuses aud2 to close, so the first and last phrases echo each other - a fit for the curtain-call theme of 'Encore'.

> Measured data (RMS over 0.25s windows): the gap on both sides of the 5 seams is always ≤0.2dB, with no jumps at all - so no volume change is audible anywhere in the film; and the film has no dead zone below -60dB, i.e. no audible silent gap exists.

## File list

| File | Description |
|---|---|
| `miku_story_30s.mp4` | **Final cut v4** (31.0s, 672×896, cel style locked + seamless native audio) |
| `shot1.mp4` … `shot6.mp4` | The 6 shot clips (v2 version, dual anchor on first/last frame) |
| `keyframes/` | 10 Flux2 cel keyframes (start and end anchors for the shots) |
| `shot1_first_ref.png` | Flux2-generated first-frame reference |
| `miku_story_poster.png` | Cover art (taken from the jump climax at 13s) |
| `concat_list.txt` | Concatenation order list |

## Reproduce: environment, parameters, time cost

- Run hardware: H20.
- Time cost: 10 keyframes × 8s + 6 shots at ~126s each, roughly 15 minutes of generation in total; editing and mixing take <1 minute. On this basis the whole pipeline produces one 30s narrative film in about 16 minutes.
- The production pipeline (v2 fixed version - dual anchor on first and last frame) is below. Step ⑤ "music" is the v2 intermediate approach; for the final audio, go by the v4 row in the "Audio design" section:

```
① First frame  Flux2 Klein 0.6MP · 8 steps (dark wings + top-light composition)
② Keyframes  2 Flux2 images per shot (start pose + end pose), same seed keeps the character consistent within the group
③ Generate  H3 fl2va dual-anchor mode: first_frame + last_frame both specified, H3 only handles the motion between the two poses
④ Join  Last keyframe of a shot = first keyframe of the next (the same image, hard cut with zero jump)
⑤ Music  Loop shot 3's BGM as a 31s bed, layer shot 1's ambient sound fading out after 5.2s, fade out the last 2s
```
