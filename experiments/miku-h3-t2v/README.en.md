# Zero image input: can text alone generate the same dance?

[中文](README.md) | English

The same "Hatsune Miku dance" was generated once before, by feeding the model a first-frame image up front ([experiments/miku-h3-i2v/](../miku-h3-i2v/)). This experiment drops image input entirely and keeps only the text prompt, to test whether text alone can pin down the theme and the character, and compares the result side by side with that version. The companion comparison log is at [docs/miku-dance-optimize.md](../../docs/miku-dance-optimize.md).

## See it in a minute

| Question | What we did | Result |
|------|------|------|
| With no image input at all, can text alone produce a dance video on the same theme | Reused the full image-to-video workflow and cut exactly one image input (see [Difference vs the image-to-video version](#difference-vs-the-image-to-video-version)) | Yes. A single generation produced a 15.08s, 704×960, 24fps video — H.264 video, AAC audio. Removing every image input did not block the pipeline |
| Better or worse picture once images are gone | Compared item by item with the image-to-video version; the two workflows differ only in that one image input | More visual detail: this one is 7.1 MB, the image-to-video version is 3.4 MB. Nearly double the file size means more detail kept in the frames |
| What keeps the character design consistent | Twin tails / green hair / skirt and the rest of the features are all written into the prompt | The hard anchor of a first frame is gone. Character consistency now depends entirely on how complete the prompt description is, and the look is no longer constrained frame by frame by an image |
| Does the audio need to be made separately | The prompt spells out a J-pop dance track + female vocals + audience ambience | Generated as H3's native synced audio, produced in the same inference run as the picture — no extra dubbing needed |

## What these terms mean

- **First-frame anchoring**: hand the model a still image as the first frame of the video. The model must start generating from that frame, so the character's look stays constrained across the whole clip. The image-to-video version took frame 1 of the original video; this experiment does not do that.
- **Native synced audio**: sound and picture come out of the same inference run, not composited later or added as a separate track.
- **Node chain**: the order of node connections in the workflow, from model loading to the final save.
- **File size**: this experiment uses file size as a rough proxy for visual detail — the two workflows differ in one image input only, so the size gap maps directly to a detail gap: bigger file, more detail.
- **API-format workflow**: the JSON exported from the ComfyUI UI that can be submitted straight through the API, with no need to rebuild anything in the interface.

## Difference vs the image-to-video version

The node chain both versions share: UNETLoader → 8-step Turbo LoRA → qwen3vl-32b CLIP → MiniMaxH3ImageToVideo → SamplerCustomAdvanced → dual VAE decode → CreateVideo → SaveVideo. The only change in this experiment: MiniMaxH3ImageToVideo gets no first_frame, and the workflow degrades to pure text-to-video.

## File list

| File | Notes |
|------|------|
| `h3_t2v_workflow.json` | ComfyUI workflow in **API format**, the final version actually run in the experiment, with no image input at all |
| `miku_dance_t2v.mp4` | Final video, specs in [See it in a minute](#see-it-in-a-minute) |
| `miku_dance_t2v_poster.png` | Poster frame (t=3s, the picture at second 3), used for the player page card |

## Reproduce

```powershell
# Submit the workflow in API format (no image uploads needed)
curl.exe -X POST --data-binary "@h3_t2v_workflow.json" http://127.0.0.1:8188/prompt
```

The request goes to the ComfyUI server running on this machine (port 8188). Model dependencies are the same as in [experiments/miku-h3-i2v/README.md](../miku-h3-i2v/README.md).
