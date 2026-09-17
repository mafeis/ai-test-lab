# Hatsune Miku Stage: Six-Shot Dual-Line Fine Cut — Score All 720 Cut Orders to Find the Smoothest, Then Speed Up the Parts AI Quietly Slowed Down

[中文](README.md) | English

> Finished cuts: [recut_cel.mp4](recut_cel.mp4) animation version 25.92s · [recut_real.mp4](recut_real.mp4) live-action version 22.22s (both 672×896, with native audio)
> Online playback: https://mafeis.github.io/ai-test-lab/#miku-stage-recut

## See it in one minute

The same six-act stage performance (hot dance → jump → turn to camera → reach and clasp → bow and exit → eyes open at the end) was generated twice, once per art style, and each style was cut into its own film. This experiment answers two questions:

| Question | Approach | Result |
|----------|----------|--------|
| Six shots can be ordered 720 ways. Which order joins most smoothly? | Give every cut point of every order a jump score, compute all of them, take the lowest | The animation version found the #1 order, 28% smoother than the original. The live-action version confirmed the existing order was already optimal |
| Some passages are visibly slowing down: the jumping figure hangs in the air for 3 seconds | First rule it a defect, not a style. Then speed up only the passages with no visible reference — hang time and freeze frames — by 2.7x | Air time fixed from 3.0s to 1.3s. Runtime -10.5% / -15.8%. Every cut-point frame left untouched |

After locking in the order and the speeds for each film, every cut is verified with per-frame pixel diffs. All 10 cut points pass.

## First, how to quantify "smooth" and "slow"

Every number below comes from these three rulers, all measured automatically by scripts (method in [Test method](#test-method)):

- **Frame diff**: the average pixel difference between two adjacent frames — how much the picture changed in that instant.
- **Baseline**: the median frame diff over the whole film, i.e. the normal amount of motion in this video. All thresholds are stated as a multiple of the baseline, so they don't depend on how action-heavy the footage is.
- **Join score**: turn the jump at each cut point into penalty points — the closer the poses on either side of a cut, the smaller the penalty, and a cross-dissolve spreads it out further. Sum the penalties of all cut points in an order and you get its total score. **Lower is smoother**.
- **Energy curve**: one number per second (the average frame diff within that second). If a few seconds suddenly fall below the baseline, the picture nearly stopped — that pinpoints the slow motion instantly.

## Source footage

Six acts × two art styles, 13 clips in total. Each clip is 5.17s / 672×896 / 24fps / with native audio. The generation pipeline carries over from [miku-story-30s](../miku-story-30s/README.md).

| Act | Animation version uses | Live-action version uses | Notes |
|-----|------------------------|--------------------------|-------|
| Spotlight entrance | — (uses the closing shot inverted) | `story2_shot2fix` 1.3~3.0s | This clip is a live-action-to-animation morph shot. The style switches at 3.15s, so only the pure live-action spotlight part before the switch is used as the opening |
| Hot dance | `story2_shot2` | `story_shot2` | |
| Jump | `story2_shot3` | `story_shot3` | The problem shot this round: the hang time was rendered as slow motion |
| Turn to camera | `story2_shot4` | `story_shot4` | Tail end freezes |
| Reach and clasp | `story2_shot5` | `story_shot5` | Tail end freezes |
| Bow and exit | `story2_shot6` | `story_shot6` | |
| Eyes open at the end | `story_shot1` | — | Eyes close to open under a frontal spotlight. Serves as the animation version's curtain call |

## First round: Reordering — score all 720 orders

Method ([recut_seq.mjs](scripts/recut_seq.mjs) scans the pairs, [recut_order.mjs](scripts/recut_order.mjs) brute-forces the orders):

1. For every possible shot pair (6 shots = 30 possible joins), measure the closest frame diff between every frame in the last 2.5s of the earlier shot and every frame in the first 2.5s of the later shot — that is the jump size of that cut. All results archived: [pairs_cel.json](pairs_cel.json) / [pairs_real5.json](pairs_real5.json) / [pairs_real6.json](pairs_real6.json).
2. An order's total score = the sum of its cut penalties. Rule: a jump up to 1.6x the baseline may hard cut and scores in full. Anything above that must ride a cross-dissolve, and only 25% of the remainder is counted (the dissolve absorbs most of the jump).
3. Exhaustively rank all orders (6 shots = 720; takes seconds on a normal machine).

| Line | Chosen order | Score and rank | Comparison |
|------|--------------|----------------|------------|
| Animation (6 shots) | dance→jump→turn→reach→exit→**eyes-open closer** | **24.9 points, #1 of 720** | The original order scored 34.6 (rank 2) — all of the 28% saved by reordering comes from that last cut |
| Live-action (main 5-shot sequence) | dance→jump→turn→reach→exit | **72.2 points, #1 of 120** | The existing order is already optimal. Rank 2 scores 72.5, just 0.3 higher |
| Live-action (6 shots with entrance) | entrance opening→main five-shot sequence | 101.8 points, #7 of 720 | The #1 by score (96.4, the lowest) shoved the entrance shot into the middle of the film — smoothest picture, broken story, discarded |

All of the animation line's gain comes from one cut, and the numbers make it obvious: the "exit→eyes open" cut costs 31.2 points, the 5th cheapest of 30 joins (a silhouette leaving as the lights die meets eyes opening in the dark — the frames are naturally close). Put that same eyes-open shot at the top, though, and "eyes open→dance" costs 70 points — close to the most expensive in the whole matrix. **Same shot, ending vs opening: the score more than doubles.** That is what "order" itself is worth. The live-action line teaches the opposite lesson: brute force is not only about finding a new order — it also confirms you don't need one.

## Second round: Anti-slow-motion — first rule it a defect, then act

The middle of the cut feels sluggish. Don't just change the speed — spend four steps confirming the problem is real and comes from the generation side:

1. **Not a playback illusion**: check the source file's framerate — steady 24fps, so the picture really was recorded slow.
2. **Locate it on the energy curve**: of the per-second frame changes, seconds 8~10 of the live-action version show only 3.2~6.4, while the seconds around them run 13~24 — the stalled picture is exactly the hang time of the jump shot (curve data: [energy_curves.json](energy_curves.json)).
3. **The prompt left evidence**: the original prompt says hangs at the peak of her jump — the model rendered "hangs" literally, as slow motion.
4. **Physics is the final word**: measured from a burst of 24 shots per second, the feet leave the ground at 0.5s and land at 3.5s — **a full 3.0s airborne**. A real human stays airborne 0.6~0.7s or less. 4x beyond physics = defect, not style (evidence image: [slowmo_hang_24fps.jpg](slowmo_hang_24fps.jpg)).

The same technique causes a second symptom: the tails of the turn-to-camera and reach shots carry 2~3.5s of "freeze drift" where the picture barely moves (source frame strips: [strip_cel_jump_src.jpg](strip_cel_jump_src.jpg) / [strip_real_reach_src.jpg](strip_real_reach_src.jpg)).

**The fix ([recut_build.mjs](scripts/recut_build.mjs))**: set speed per time segment inside a shot — the hang time eases up gently first, runs at 2.7x in the middle, then eases back down, so the speed change itself never gets noticed. Three disciplines:

- **Only speed up pictures with no reference.** In hang time (nothing in the sky to compare motion against) and freeze frames (the picture was already still), even 2.7x is unreadable to the audience. Real actions with a clear trajectory — takeoff, landing, head turns — always keep original speed. Even 1.2x gives it away.
- **Cut-point frames never move.** Every cut-point frame accepted in the last round stays inside an original-speed segment, so the first round's acceptance conclusions stay valid automatically.
- **Don't fix deliberate slowness.** The bow exit, the eyes-open ending, and the spotlight entrance are narrative pacing — they keep original speed. Physics is still what separates style from defect: only slow that breaks physics is a defect.

## Test method

Decode the finished film frame by frame at 24fps (same framerate as the source) and measure frame diffs:

- The **median** frame diff of the whole film is the baseline (the median ignores the fades at the ends).
- At each cut point, take the max jump inside a 0.45s window around the switch: **up to 1.6x the baseline = near seamless, up to 3x = acceptable with a dissolve**.
- Hard-cut points get one extra check: the diff of the switch frame pair itself. The window max can be contaminated by big in-shot motion; only the switch pair reflects the true jump.
- Beyond the numbers, cut out the frames before and after each cut point into a side-by-side strip for visual inspection ([verify_cel_joins.jpg](verify_cel_joins.jpg) / [verify_real_joins.jpg](verify_real_joins.jpg)). Then pull one frame per second from the whole film to check pacing ([verify_cel_overview.jpg](verify_cel_overview.jpg) / [verify_real_overview.jpg](verify_real_overview.jpg)).

## Acceptance: before vs after the fix

| Metric | Animation before | Animation after | Live-action before | Live-action after |
|--------|------------------|-----------------|--------------------|--------------------|
| Runtime | 28.96s | **25.92s** (-10.5%) | 26.38s | **22.22s** (-15.8%) |
| Jump-shot hang time | 2.75s | **about 1.2s** | 3.0s | **about 1.3s** (recheck burst: [fixed_cel_jump.jpg](fixed_cel_jump.jpg) / [fixed_real_jump.jpg](fixed_real_jump.jpg)) |
| Hang-time energy (frame change per second) | 2.4~2.9 for 3 straight seconds | Back up within 1 tick | 3.2~6.4 for 3 straight seconds | 8.9~9.0, valley gone |
| Freeze-tail energy | 1.0~1.4 plateau | 2.2~2.3 | 5.4~6.3 held for 5 seconds | 8.3~9.6 |
| Whole-film baseline | 3.01 | 3.50 | 6.34 | 9.36 |

Cut-point acceptance (on the fixed films, 24fps): on the animation line, 3 of the 5 cuts are hard cuts with switch-frame-pair diffs of 0.31 / 0.39 / 1.35 against a baseline of 3.50 — all well below baseline, near seamless. Both dissolves stay inside the 3x threshold. On the live-action line, all 5 cuts stay under 2.84x baseline. One instructive episode: a cut point at the animation version's spin shot looked fine under low-framerate review; re-measuring at the source framerate exposed a 4.58x jump, finally smoothed out with a 0.25s short dissolve — **never review footage at a framerate below the source's**.

## Reusable conclusions

- Judge slow motion before you cut. Measure hang time against the physiological limit: over 4x is a defect, within it is pacing. The energy curve is what pinpoints which seconds stalled.
- Speed-ups can only hide in pictures with no reference: 2.7x on hang-time and freeze-frame segments is imperceptible; 1.2x on anything with an action trajectory gives it away.
- Brute force gives you a ranking and a score floor. Narrative keeps the final call: the smoothest order moved the entrance shot into the middle of the film, so it was discarded — pay 5.6% more score and buy the story back.
- Treat "cut-point frames must stay inside original-speed segments" as a premise of the speed design. Then the two rounds of changes never break each other, and acceptance runs only once.
- A speed-up lifts the whole film's baseline (6.34→9.36). Every threshold is relative, so the acceptance criteria carry across versions unchanged.
- A shot's record (the original prompt) is as valuable as the footage itself in post diagnosis: the single line hangs at the peak pinned down the root cause.

## File list

| File | What it is |
|------|------------|
| recut_cel.mp4 / recut_real.mp4 | The two finished cuts (local delivery names: Fine_Cut_Miku_Stage_Cel_Animation_6shots / Live_Action_cos_6shots.mp4) |
| poster_cel.png / poster_real.png | Poster frames |
| slowmo_hang_24fps.jpg | Defect evidence: 24 shots per second, 3.0s airborne |
| strip_cel_jump_src.jpg / strip_real_reach_src.jpg | Source frame strips: hang time / freeze drift |
| fixed_cel_jump.jpg / fixed_real_jump.jpg | Recheck bursts of the same shots after the speed-up |
| verify_*_joins.jpg | Frames before and after each cut point, side by side (visual acceptance) |
| verify_*_overview.jpg | Whole film at one frame per second |
| pairs_cel.json / pairs_real5.json / pairs_real6.json | Raw data from the jump scan of the 30 possible joins |
| energy_curves.json | Per-second frame-change curves, before and after the fix |
| scripts/ | Four scripts: scan → brute force → build → verify. The whole pipeline is reproducible |

## Reproduce

```bash
export FFMPEG=ffmpeg FFPROBE=ffprobe   # If not on PATH, switch to absolute paths
# Place source footage at <workspace>/videos/<shot_name>_00001_.mp4
E=experiments/miku-stage-recut
node $E/scripts/recut_seq.mjs    cel  story2_shot2,story2_shot3,story2_shot4,story2_shot5,story2_shot6,story_shot1
                                 # Measure the jump score of each of the 30 possible joins
node $E/scripts/recut_order.mjs  cut/mseq/cel/pairs.json story2_shot2,...,story_shot1
                                 # Rank all 720 orders by score
node $E/scripts/recut_build.mjs  cel    # Or real: segmented speed-up + dissolves + fades, encoded to the final cut in one pass
node $E/scripts/recut_verify.mjs cel    # Per-cut acceptance numbers + visual check images
```

Pure CPU. The whole pipeline runs in minutes.

## Related experiments

- How the source footage was generated: [miku-story-30s](../miku-story-30s/README.md) (keyframe dual anchors lock the art style)
- First use of this same fine-cut method (picking the best take among several from one prompt): [qipao-fine-cut](../qipao-fine-cut/README.md)
