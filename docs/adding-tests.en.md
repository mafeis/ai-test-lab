# AI Test Lab · Adding Tests and Annotation Spec

[中文](adding-tests.md) | English

> This doc is the full how-to manual for adding tests later. **Core rule: adding a test means writing JSON only. No code changes.**

Repo: <https://github.com/mafeis/ai-test-lab>
Site: <https://mafeis.github.io/ai-test-lab/>

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Quick Start: Two Steps to Add a Test](#2-quick-start-two-steps-to-add-a-test)
3. [Full Test JSON Schema](#3-full-test-json-schema)
4. [Annotation Rules (Episode Numbering / Sweet Spot Stars)](#4-annotation-rules-episode-numbering--sweet-spot-stars)
5. [Media Asset Rules](#5-media-asset-rules)
6. [Player Behavior and Settings Persistence](#6-player-behavior-and-settings-persistence)
7. [Page Layout and Interaction Conventions](#7-page-layout-and-interaction-conventions)
8. [Deployment and Caching Strategy](#8-deployment-and-caching-strategy)
9. [Troubleshooting FAQ](#9-troubleshooting-faq)
10. [English Data Files](#10-english-data-files)

---

## 1. Overall Architecture

Four layers, each doing one job:

| Layer | File | Job | When to change |
|---|---|---|---|
| Shell | `index.html` | Static skeleton: top bar (category chips), left player area, right list column, footer | Almost never |
| Styles | `assets/style.css` | All visuals: layout, player, episode tiles, responsive | When changing styles |
| Renderer | `assets/app.js` | Generic logic: read data -> render list/player/episodes, event delegation | When adding a new "capability" |
| **Data** | `data/manifest.json` + `data/tests/*.json` | **All test content** | **Every time you add a test** |

Key point: `app.js` is a generic renderer. It knows nothing about any specific test. One test = one JSON file + one path line in the manifest.

```
ai-test-lab/
├── index.html                  # shell
├── assets/
│   ├── style.css               # all styles
│   └── app.js                  # generic renderer (data-driven)
├── data/
│   ├── manifest.json           # test manifest (array of paths)
│   └── tests/
│       ├── blender-dance.json  # one JSON per test
│       ├── h3-i2v.json
│       ├── h3-t2v.json
│       ├── h3-res-sweep.json
│       ├── t2i-res-sweep.json
│       └── t2i-ref-i2v.json
├── experiments/                # media assets (video/image/workflow/README)
│   ├── miku-blender-dance/
│   ├── miku-h3-i2v/
│   ├── miku-h3-t2v/
│   ├── h3-res-sweep/
│   ├── t2i-res-sweep/
│   └── t2i-ref-i2v/
├── images/                     # shared images (e.g. source material)
├── docs/
│   ├── adding-tests.md         # ← this doc
│   └── miku-dance-optimize.md  # experiment log
└── README.md
```

---

## 2. Quick Start: Two Steps to Add a Test

**① Create the data file** `data/tests/my-test.json`:

```json
{
  "id": "my-test",
  "category": "Video",
  "title": "My test title",
  "summary": "One-line summary, shown in the list row and the title bar",
  "date": "2026-09-17",
  "tags": [["model name", "green"], ["key conclusion", "amber"]],
  "media": {
    "type": "video",
    "src": "experiments/my-test/output.mp4",
    "poster": "experiments/my-test/poster.png"
  },
  "stats": [["duration", "12.3s"], ["resolution", "704×960"]],
  "findings": ["Finding one", "Finding two"],
  "links": [["📄 Report", "https://github.com/..."]]
}
```

**② Register it**: add one line to the `tests` array in `data/manifest.json`:

```json
{ "tests": [
  "data/tests/blender-dance.json",
  "data/tests/my-test.json"
]}
```

Push and it goes live. Add `#my-test` to the URL to jump straight to this test.

---

## 3. Full Test JSON Schema

### Top-level fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Unique ID, used for URL deep links (`#id`). Short hyphenated English recommended |
| `category` | string | ✅ | Category name. **The top category chips are generated automatically from every test's category**; for a new category, register a color in `CATEGORY_COLORS` in `app.js` (skip it and nothing breaks, a default color is used) |
| `title` | string | ✅ | Title, shown in the list row + the player title bar |
| `summary` | string | ➖ | Summary, second line of the list row (ellipsis when too long) + title bar |
| `date` | string | ➖ | Date, `YYYY-MM-DD` |
| `tags` | `[label, cls][]` | ➖ | Badges. `cls`: `green` / `amber` / `gray` / `purple` / empty (blue) |
| `media` | object | ✅ | Media, see below |
| `stats` | `[k, v][]` | ➖ | "Test data" table |
| `findings` | string[] | ➖ | "Findings" list |
| `links` | `[label, url][]` | ➖ | External link buttons (report, workflow, etc.) |

### media field (three types)

**Single video:**

```json
{ "type": "video", "src": "experiments/x/out.mp4", "poster": "experiments/x/poster.png" }
```

**Single image:**

```json
{ "type": "image", "src": "experiments/x/out.png" }
```

**Multi-clip (gallery)** — episode tiles appear, you pick what to play:

```json
{ "type": "gallery", "items": [
  { "type": "video", "src": "experiments/x/a.mp4", "poster": "experiments/x/a.png", "label": "<b>ModelA 0.1MP</b> 256×352 · 10.5s" },
  { "type": "image", "src": "experiments/x/b.png", "label": "<b>ModelB 0.6MP</b> 672×896 · 4.1s ★sweet spot" }
]}
```

- Item `type` can mix video and image (mixed gallery/video is fine too)
- Single-video / single-image tests: **episodes hide automatically**, selecting the test plays it right away
- Gallery with ≥2 items: episode tiles appear under the player

---

## 4. Annotation Rules (Episode Numbering / Sweet Spot Stars)

Both automated behaviors on the episode tiles are parsed from `label`. **No code changes needed**:

### 4.1 Series grouping and numbering

**Rule**: start the label with `<b>series name + tier</b>`. The renderer extracts the series name and numbers each series separately.

```html
"label": "<b>Z-Image 0.1MP</b> 256×352 · 2.0s"   → tile shows  Z1
"label": "<b>Z-Image 0.2MP</b> 384×512 · 2.0s"   → tile shows  Z2
…
"label": "<b>Flux2 0.1MP</b> 256×352 · 4.6s"     → tile shows  F1 (new series, count restarts)
…
"label": "<b>Flux2 0.6MP</b> 672×896 · 10.4s"    → tile shows  F6
```

- Series name → prefix: take the first letter of the name (`Z-Image`→`Z`, `Flux2`→`F`); on a prefix clash it automatically falls back to the first two letters
- **A series needs at least 2 entries with the same name**: a title that appears only once inside `<b>` (like "Final cut" or "Face comparison") does not join grouping; it gets a plain global index `1-N`, and no line break between series. Otherwise every block would be its own series and the row would collapse to one tile per line
- **Only one series present**: numbering automatically degrades to plain `1-N` (no pointless prefix)
- Chinese series names are supported too (first character is used)
- Suggested series/tier separator: series name + space + numeric tier (like `Z-Image 0.6MP`); the parser strips the trailing tier part

### 4.2 Sweet spot star ★

**Rule**: if the label contains `★` anywhere, that episode tile automatically shows a gold star badge + gold border; the header shows the total star count.

```json
{ "label": "<b>Z-Image 0.6MP</b> 672×896 · 4.1s ★sweet spot" }
```

```
Episodes 20 · ★2
│ Z6★ │  ← gold ★ badge + gold border, spotted at a glance
```

The hover tooltip also starts with `★`. Put `★` at the end of the label and spell out what it means (`★sweet spot` / `★recommended` / `★fastest`).

### 4.3 Label writing conventions (summary)

```html
<b>series name tier</b> key data · note ★meaning
```

- `<b>` part = series name + tier (drives the episode numbering)
- Body: key data like resolution and duration (separated by `·`)
- End with `★` to mark the sweet spot / recommended tier
- Labels support HTML (only `<b>`); everything else is escaped on display

---

## 5. Media Asset Rules

- **Folder**: put assets in `experiments/<experiment-name>/`, matching the relative paths in the JSON
- **Video**: H.264 + AAC MP4, SAR must be 1:1 (square pixels), 24fps or 30fps
- **Poster**: give every video a poster if you can (a first-frame grab is fine): `ffmpeg -i in.mp4 -frames:v 1 poster.png`
- **Size**: no fixed requirement — the player letterboxes at the original aspect ratio and **never stretches**
- **Multi-tier comparisons**: put the tier in the file name (like `zimg_mp0.1_00001_.png`) so sorting and scripts are easy
- Keep an experiment `README.md` (method, parameter table) in the experiments folder too, and link to it from `links`

---

## 6. Player Behavior and Settings Persistence

- **Fixed stage size**: `min(68vh, 620px)` (`min(52vh, 440px)` on mobile), video uses `object-fit: contain`, clips don't jump around
- **Aspect ratio preserved**: `width/height: auto; max-width/max-height: 100%`, never stretched at any resolution
- **Settings persist** (localStorage, key `aitl-player-settings`): volume / mute / speed / loop mode, kept across videos and sessions; switching videos, refreshing, or changing tests does not reset them
- **Speed**: click the `1x` button and pick directly from the popup panel; steps `[0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5]` (slow end to study the generation process, fast end to skim); to change the steps, edit the `SPEEDS` array in `app.js`
- **Loop**: loop one / loop all (a gallery plays to the end and wraps back to the first; a single-clip test loops on to the next visible test)
- **Shortcuts**: Space play/pause · ←→ ±5s · ↑↓ volume · M mute · L loop one · F fullscreen
- **PiP / fullscreen**: feature-detected, auto-hidden when unsupported

---

## 7. Page Layout and Interaction Conventions

```
┌──────────────────────────────────┬───────────────┐
│ Top bar: category chips (the     │ Sidebar       │
│ only category entry)             │ (sticky, one  │
├──────────────────────────────────┤ scrollbar for │
│                                  │ the whole col)│
│   Main player (fixed             │ ┌───────────┐ │
│   min(68vh,620px),               │ │ Test list │ │
│   object-fit: contain,           │ │ (text     │ │
│   never stretched)               │ │  rows)    │ │
│                                  │ └───────────┘ │
├──────────────────────────────────┤ ┌───────────┐ │
│ Control bar (loop/speed/volume/  │ │ Episode   │ │
│ PiP/fullscreen)                  │ │ tiles     │ │
├──────────────────────────────────┤ │ Z1…Z10    │ │
│ Title bar · test details         │ │ F1…F10    │ │
│ (data/findings/links)            │ └───────────┘ │
└──────────────────────────────────┴─┴───────────┴─┘
```

- **Categories**: only in the top chips; no category list on the left (lesson learned: entry points in several places drift out of sync)
- **Right sidebar**: sticky, scrolls on its own; picking playback content does not scroll the main page; **the whole column gets exactly one scrollbar** (nested inner scrolling is a bug)
- **Test list**: plain text rows (category color dot + title + summary), **no thumbnails** (saves space, loads fast)
- **Episode tiles**: compact grid, numbered by series groups (see §4); the current item gets a blue background + volume-bar animation and auto-scrolls into view
- **Event binding**: always container-level event delegation (`closest(".chip")` etc.), so rebuilding the DOM never loses events
- **Mobile ≤960px**: player on top, list scrolls sideways; touch targets ≥38px; volume slider hidden

---

## 8. Deployment and Caching Strategy

```powershell
git add -A
git commit -m "..."
git push
Start-Sleep -Seconds 75          # wait for the GitHub Pages build
# Verify: pull the live file with a random param, check for the new-content marker
Invoke-WebRequest -Uri "https://mafeis.github.io/ai-test-lab/assets/app.js?nocache=$(Get-Random)" -UseBasicParsing
```

**Cache rule (important)**: after changing `style.css` or `app.js`, you must bump the version number in `index.html` at the same time:

```html
<link rel="stylesheet" href="assets/style.css?v=YYYYMMDDx">
<script src="assets/app.js?v=YYYYMMDDx"></script>
```

Increment the version letter (a→b→c…). Skip it and the browser keeps the stale cache — "I pushed but nothing changed". GitHub Pages caches the HTML itself for about 10 minutes, so wait a minute or two before refreshing.

**Tests only (touching only data/ and experiments/)? No version bump needed.**

---

## 9. Troubleshooting FAQ

| Symptom | Cause | Fix |
|---|---|---|
| Clicks do nothing | Stale JS cache | Bump the version in `index.html`, then refresh |
| Red error box at the bottom-left | The global error handler caught an exception | Screenshot the text in the box (it includes file:line) |
| `Cannot read properties of null` when switching category/clip | The render path misses a null check for empty tests | Check that the `!t` guard in `renderReelNav` / `currentReel` runs **before** destructuring |
| Episodes don't appear | Gallery has fewer than 2 items, or `media.type` is wrong | Confirm `type: "gallery"` and `items.length ≥ 2` |
| Video stretched / red box | A CSS edit broke the contain rules | Restore `.stage video` with `object-fit: contain; width/height: auto` (the red-box logic was removed; if you see one, it is stale cache) |
| Double scrollbars | Some element got an inner `overflow` | Keep `.sidebar` as the only scroll container in the right column |
| New category has the wrong color | Color not registered | Add a line to `CATEGORY_COLORS` in `app.js` |
| Data fails to load | Bad manifest path or JSON syntax error | Check the paths in `data/manifest.json` and JSON validity; broken files are skipped with a console warning |

**Small validation script** (quick local JSON check):

```powershell
Get-ChildItem data/tests/*.json | ForEach-Object {
  try { $_ | Get-Content -Raw | ConvertFrom-Json | Out-Null; "OK  $($_.Name)" }
  catch { "BAD $($_.Name): $($_.Exception.Message)" }
}
```

---

## 10. English Data Files

English content is optional. You may place `data/tests/<id>.en.json` right next to `data/tests/<id>.json`.

- When the page is switched to EN, it tries to load `<id>.en.json` first.
- If that file is missing, it falls back to the Chinese file automatically.

The English file must match its Chinese twin in structure: same `id`, `date`, media `src` and `poster` paths, `media.columns`, item order, tag colors, and link URLs. Only the translated text may differ.

---

*Last updated: 2026-09-17 · In sync with repo behavior at `8d98f0e`*
