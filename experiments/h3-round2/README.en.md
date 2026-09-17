# Follow-up experiment: chained continuation consistency + audio prompt isolation (H3 image-to-video)

[中文](README.md) | English

## The one-minute version

| Question | What we did | Result |
|---|---|---|
| Use the last frame of a shot as the first frame of the next and shoot 3 in a row - does the character change? | Hand the last frame to the next shot, 3 shots in total, prompt and seed unchanged throughout | No face swap and no outfit change across all 3 shots; only after shot 3 does the face read slightly younger |
| Change only the music line in the prompt - does the picture get affected? | First frame, seed and picture prompt all fixed, only the music line changed, 4 versions for comparison | The 4 versions have 4 different tracks and a completely identical picture; even with no music line there's still a soundtrack |

This experiment continues from [t2i-ref-i2v](../t2i-ref-i2v/) and answers the two questions it left behind. All shots share one set of generation settings, listed together in the "Reproduce" section at the end.

## Experiment C: feed each shot's last frame into the next - does the character hold up?

Method: shot1's last frame becomes shot2's first frame, shot2's last frame becomes shot3's first frame, prompt and seed unchanged, 3 shots in total; shot1 is reused straight from the upstream finished video. Note: seed here is the random number that starts generation - only with the same value are the shots comparable.

| Shot | First-frame source | Gen time | Output |
|---|---|---|---|
| shot1 | Z-Image best-setting reference image | 125.7s | [upstream t2iref_zimg_mp0.6](../t2i-ref-i2v/t2iref_zimg_mp0.6_00001_.mp4) |
| shot2 | shot1's last frame ([shot1_last.png](shot1_last.png)) | 124s | [cont_shot2_00001_.mp4](cont_shot2_00001_.mp4) |
| shot3 | shot2's last frame | 124s | [cont_shot3_00001_.mp4](cont_shot3_00001_.mp4) |

The three shots each took 124-125.7s to generate (about two minutes): continuing costs the same as a plain single-shot generation, and the frame-by-frame handoff adds no extra time.

**Results**
1. **Character consistency holds**: across all three shots the twin tails, sailor uniform, gold double-breasted buttons, headphones and face shape stay stable - no face swap, no outfit change. Last-frame handoff can carry multi-shot continuous storytelling.
2. **Camera language connects naturally**: shot2 pulls back from a close-up to full body, shot3 pushes in close again. Using the last frame as the next first frame naturally forms the camera logic of a "next shot", so transitions are seamless.
3. **Slight drift exists**: after 3 shots the face reads a touch younger and "sweeter" than in shot1. Drift accumulates with shot count; within 3-4 shots you can skip correction. Keep chains to ≤3-4 shots, or correct with a reference image every 2 shots.
4. Reusing the previous shot's last frame as the first frame gives a seamless transition; for a hard-cut effect, use the same reference image + a different seed instead.

## Experiment D: change only the music line - does the picture drift?

Variable control: **first frame (Z-Image best-setting image), seed, and picture prompt all identical**, only the music line changed:

| Audio prompt | Track check | Picture | Output |
|---|---|---|---|
| J-pop electronic synth | distinct track A | same framing as baseline | [aud_pop](aud_pop_00001_.mp4) |
| heavy rock guitar + drums + crowd cheers | distinct track B | same framing | [aud_rock](aud_rock_00001_.mp4) |
| cinematic orchestral (strings + piano) | distinct track C | same framing | [aud_orchestral](aud_orchestral_00001_.mp4) |
| (no audio line at all) | distinct track D | same framing | [aud_none](aud_none_00001_.mp4) |

**Results**
1. **The 4 audio tracks all differ**: computing a PCM hash for each of the 4 tracks (a fingerprint taken from the raw uncompressed audio data - a different value means different audio content) gives 4 distinct values. So the music line really does control the genre of H3's auto-generated audio.
2. **Picture stability is excellent**: under the same seed, the 4 videos are completely identical in characters, stage and camera - the audio prompts did not pull the picture off course.
3. **"none" is not silent**: without an audio line H3 still auto-adds a soundtrack; the track measures mean -14dB (average loudness about -14 decibels, a clearly audible continuous sound). For a quiet scene you must write it into the prompt explicitly, something like "ambient silence/quiet room tone".
4. Practical takeaway: **the audio line is an independently adjustable parameter** - changing the BGM does not require re-rolling the picture.

## File list

| File | Description |
|---|---|
| `cont_shot{2,3}_00001_.mp4` | chained continuation shots 2/3 |
| `aud_{pop,rock,orchestral,none}_00001_.mp4` | the 4 audio-isolation variants |
| `shot1_last.png` / `shot1_first_ref.png` | last frame for handing off to the next shot, plus the original reference image |

## Reproduce

All shots share the following generation settings:

- Resolution: 0.6MP (672×896), a small fast tier, enough to verify consistency
- Duration: 124 frames in total, 5.17s at 24fps (24 frames per second), so each finished clip runs about 5 seconds
- Audio: includes H3's native generated audio track
- seed: 91720260, the same value throughout
