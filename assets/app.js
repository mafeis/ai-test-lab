/* ============================================================
   AI Test Lab · 通用渲染器（剧场模式 v2）
   共用大播放器 + 自定义控制条（循环/倍速/音量/进度/快捷键）
   左侧列表 + 片段切换（无横向滚动条）+ 移动端适配
   ============================================================ */

/* 全局错误可见化：任何脚本错误都打到页面角落，不再静默失效 */
window.addEventListener("error", e => {
  let box = document.getElementById("errbox");
  if (!box) {
    box = document.createElement("div");
    box.id = "errbox";
    box.style.cssText = "position:fixed;bottom:8px;left:8px;z-index:9999;max-width:70%;background:#dc2626;color:#fff;font:12px/1.5 monospace;padding:8px 12px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);";
    document.body.appendChild(box);
  }
  try {
    box.textContent = `${T().err}: ${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`;
  } catch {
    box.textContent = `⚠ ${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`;
  }
  setTimeout(() => box.remove(), 10000);
});

/* 分类 → accent 色登记表（新分类在这里加一行色号即可） */
const CATEGORY_COLORS = {
  "视频生成": "var(--c-video)",
  "参数扫描": "var(--c-sweep)",
  "图像生成": "var(--c-image)",
  "Agent 任务": "var(--c-agent)",
  /* 英文版分类名共用同一套色 */
  "Video": "var(--c-video)",
  "Parameter Sweep": "var(--c-sweep)",
  "Image": "var(--c-image)",
  "Agent Task": "var(--c-agent)",
};

/* ---------- 双语（中/EN） ----------
   数据层：LANG=en 时优先取 <id>.en.json，缺失自动回退中文
   界面层：动态文案走 T()，静态文案启动时快照原文、切 EN 时替换 */
const LS_LANG = "atl-lang";
let LANG = localStorage.getItem(LS_LANG)
  || (String(navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en");
const ALL_CAT = "❖all❖";   // 「全部」哨兵：与语言无关，切语言不失效
const I18N = {
  zh: { all: "全部", uncat: "未分类", empty: "该分类下暂无测试", mainReel: "正片",
        episodes: "选集", unit: " 个", pick: "← 从左侧选择一个测试开始播放",
        open: "在 GitHub 打开", data: "测试数据", findings: "结论与发现",
        loadFail: "数据加载失败（检查 data/manifest.json）", err: "⚠ JS 错误",
        title: null },
  en: { all: "All", uncat: "Uncategorized", empty: "No tests in this category", mainReel: "Main",
        episodes: "Episodes", unit: " items", pick: "← Pick a test on the left to start",
        open: "Open on GitHub", data: "Test data", findings: "Findings",
        loadFail: "Failed to load data (check data/manifest.json)", err: "⚠ JS error",
        title: "AI Test Lab · AI Experiments Playground" },
};
const T = () => I18N[LANG];

/* 静态文案替换表：EN 覆盖值；zh 用启动时快照的原文还原 */
const EN_STATIC = [
  { sel: ".brand-sub", text: "AI Experiments Playground" },
  { sel: "#sidebar-head", text: "Playlist" },
  { sel: "#c-play", title: "Play / Pause (Space)", aria: "Play or pause" },
  { sel: "#c-seek", aria: "Seek" },
  { sel: "#c-loop-one", text: "Loop one", title: "Loop this clip (L)" },
  { sel: "#c-loop-all", text: "Loop all", title: "Loop the list" },
  { sel: "#c-rate", title: "Playback speed" },
  { sel: "#c-mute", title: "Mute (M)", aria: "Mute" },
  { sel: "#c-vol", aria: "Volume" },
  { sel: "#c-pip", title: "Picture in picture", aria: "Picture in picture" },
  { sel: "#c-full", title: "Fullscreen (F)", aria: "Fullscreen" },
  { sel: "#filters", aria: "Category filter" },
  { sel: ".footer", html:
      `<strong>Adding a test</strong> (no code changes needed):
       ① create a <code>.json</code> under <code>data/tests/</code> (schema: <a href="https://github.com/mafeis/ai-test-lab/blob/main/docs/adding-tests.en.md" target="_blank" rel="noopener">docs/adding-tests.en.md</a>, plus an optional <code>&lt;id&gt;.en.json</code> for this language);
       ② add its path to the <code>tests</code> array in <code>data/manifest.json</code>.
       Refresh and it appears; <code>#test-id</code> deep-links.
       <br>
       <strong>Label rules</strong>: <code>&lt;b&gt;Series Tier&lt;/b&gt;</code> → chips auto-number per series (Z1-Z10 / F1-F10); <code>★</code> in a label → gold star on the chip (sweet-spot pick).
       <br>
       Shortcuts: Space play · ←→ seek 5s · ↑↓ volume · M mute · L loop-one · F fullscreen
       <a href="https://github.com/mafeis/ai-test-lab">github.com/mafeis/ai-test-lab</a>` },
];
let STATIC_SNAPSHOT = null;
const ORIG_TITLE = document.title;
function applyStatic() {
  if (!STATIC_SNAPSHOT) {
    STATIC_SNAPSHOT = EN_STATIC.map(o => {
      const el = document.querySelector(o.sel);
      return el && {
        el, text: el.textContent, html: el.innerHTML,
        title: el.getAttribute("title"), aria: el.getAttribute("aria-label"),
      };
    });
  }
  const en = LANG === "en";
  EN_STATIC.forEach((o, i) => {
    const rec = STATIC_SNAPSHOT[i];
    if (!rec) return;
    if (o.text != null) rec.el.textContent = en ? o.text : rec.text;
    if (o.html != null) rec.el.innerHTML = en ? o.html : rec.html;
    if (o.title != null) rec.el.setAttribute("title", en ? o.title : (rec.title ?? ""));
    if (o.aria != null) rec.el.setAttribute("aria-label", en ? o.aria : (rec.aria ?? ""));
  });
  document.documentElement.lang = en ? "en" : "zh-CN";
  document.title = en ? I18N.en.title : ORIG_TITLE;
}
function syncLangBtn() {
  const b = document.getElementById("lang-btn");
  if (b) b.textContent = LANG === "zh" ? "EN" : "中文";
}
function setLang(l) {
  LANG = l;
  localStorage.setItem(LS_LANG, l);
  applyStatic(); syncLangBtn();
  ACTIVE_CAT = ALL_CAT; ACTIVE_ID = null;   // 分类名随语言变化，重置后由 boot 重新定位
  boot();
}

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];   // 倍速菜单：超慢放细看生成 + 常规快放

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- 数据归一化 ---------- */

function normalizeReels(t) {
  const m = t.media;
  if (!m) return [];
  if (m.type === "gallery") {
    return m.items.map((it, i) => ({
      kind: it.type || "video",
      src: it.src,
      poster: it.poster || "",
      label: it.label || `#${i + 1}`,
      html_label: it.label || "",
    }));
  }
  return [{
    kind: m.type,
    src: m.src,
    poster: m.poster || "",
    label: T().mainReel,
    html_label: "",
  }];
}

function firstThumb(t) {
  const m = t.media;
  if (!m) return "";
  if (m.type === "video") return m.poster || "";
  if (m.type === "image") return m.src;
  if (m.type === "gallery") {
    const withPoster = m.items.find(it => it.poster);
    return (withPoster || m.items[0] || {}).poster || "";
  }
  return "";
}

/* ---------- 状态 ---------- */

let ALL_TESTS = [];
let ACTIVE_CAT = ALL_CAT;
let ACTIVE_ID = null;
let ACTIVE_REEL = 0;
let LOOP_MODE = "off";        // off | one | all
let PLAYBACK_RATE = 1;

/* ---------- 播放器设置持久化（localStorage） ----------
   保存：音量 / 静音 / 倍速 / 循环模式，跨视频、跨会话生效 */
const SETTINGS_KEY = "aitl-player-settings";

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (typeof s.volume === "number") VOLUME = Math.min(1, Math.max(0, s.volume));
    if (typeof s.muted === "boolean") MUTED = s.muted;
    if (typeof s.rate === "number") {
      const allowed = SPEEDS.includes(s.rate);
      if (allowed) PLAYBACK_RATE = s.rate;
      else {
        /* 旧档位吸附到最接近的现有档位 */
        const nearest = SPEEDS.reduce((a, b) => Math.abs(b - s.rate) < Math.abs(a - s.rate) ? b : a, SPEEDS[0]);
        PLAYBACK_RATE = nearest;
      }
    }
    if (["off", "one", "all"].includes(s.loop)) LOOP_MODE = s.loop;
  } catch (e) { /* ignore corrupt settings */ }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      volume: VOLUME, muted: MUTED, rate: PLAYBACK_RATE, loop: LOOP_MODE,
    }));
  } catch (e) { /* storage unavailable */ }
}

let VOLUME = 1;
let MUTED = false;

function currentTest() { return ALL_TESTS.find(t => t.id === ACTIVE_ID) || null; }
function currentReel(t) { const r = normalizeReels(t); return r[ACTIVE_REEL] || r[0] || null; }

/* ---------- 右侧列表（测试清单：纯文字行，无缩略图） ---------- */

function renderList() {
  const el = document.getElementById("testlist");
  const visible = ALL_TESTS.filter(t => ACTIVE_CAT === ALL_CAT || t.category === ACTIVE_CAT);
  if (!visible.length) {
    el.innerHTML = `<div class="empty">${esc(T().empty)}</div>`;
    return;
  }
  /* 按 category 分组插入小标题；选了具体分类时只显示该组 */
  const groups = [...new Set(visible.map(t => t.category || T().uncat))];
  el.innerHTML = groups.map(cat => {
    const items = visible.filter(t => (t.category || T().uncat) === cat).map(t => {
      const color = CATEGORY_COLORS[t.category] || "var(--accent)";
      return `
      <button class="testitem ${t.id === ACTIVE_ID ? "active" : ""}" data-id="${esc(t.id)}"
              style="--cat-color: ${color}" title="${esc(t.summary || t.title)}">
        <span class="ti-dot"></span>
        <span class="ti-text"><div class="ti-title">${esc(t.title)}</div></span>
      </button>`;
    }).join("");
    return (ACTIVE_CAT === ALL_CAT ? `<div class="list-group-label">${esc(cat)}</div>` : "") + items;
  }).join("");

  /* 当前测试的项自动滚进可视区 */
  el.querySelector(".testitem.active")?.scrollIntoView({ block: "nearest" });
}

/* ---------- 片段选集（紧凑方块，悬停显示片段信息） ---------- */

/* ---------- 片段选集编号：按模型/系列分组编号（Z1-10, F1-10…） ----------
   提取 label 开头加粗段作为系列名，取每系列首字（去重后）作前缀；无系列的沿用全局序号 */
function chipLabels(reels) {
  const seriesOf = r => {
    const m = (r.html_label || r.label || "").match(/<b>([^<]+)<\/b>/);
    if (!m) return null;
    /* 系列名去掉末尾的档位数字部分（如 "Z-Image 0.1MP" → "Z-Image"） */
    return m[1].replace(/[\s]*[0-9.]+MP.*$/u, "").trim();
  };
  const series = reels.map(seriesOf);
  /* 同名至少出现两次才算真系列（如 Z-Image / Flux2 的档位扫描）；
     只出现一次的 <b> 段是条目自己的标题，不参与分组——否则每块都自成一系，
     前缀编号既没信息量，系列间强制换行还会挤成一行一个 */
  const seriesCount = {};
  series.forEach(s => { if (s) seriesCount[s] = (seriesCount[s] || 0) + 1; });
  const realSeries = series.map(s => (s && seriesCount[s] >= 2 ? s : null));
  const names = [...new Set(realSeries.filter(Boolean))];
  /* 只有一个系列（或全无系列）→ 全局序号 1..N；series 始终返回数组（调用方依赖） */
  if (names.length <= 1) {
    return { labels: reels.map((_, i) => String(i + 1)), series: realSeries, starts: {} };
  }

  const prefixes = {};
  names.forEach(n => {
    const base = n.replace(/^Z-Image$/i, "Z").replace(/^Flux2?(\s.*Klein.*)?$/i, "F")
                  .replace(/[^A-Za-z\u4e00-\u9fa5]/g, "");
    prefixes[n] = (base || n).charAt(0).toUpperCase();
  });
  /* 前缀冲突时用前两个字母 */
  const used = new Set();
  names.forEach(n => {
    if (used.has(prefixes[n])) {
      const alt = n.replace(/[^A-Za-z\u4e00-\u9fa5]/g, "").slice(0, 2).toUpperCase();
      prefixes[n] = alt || n.charAt(0);
    }
    used.add(prefixes[n]);
  });
  const counters = {};
  const labels = realSeries.map((s, i) => {
    if (!s) return String(i + 1);
    counters[s] = (counters[s] || 0) + 1;
    return `${prefixes[s]}${counters[s]}`;
  });
  /* 每个系列在选集中的起始下标（用于系列间换行） */
  const starts = {};
  realSeries.forEach((s, i) => { if (s && starts[s] === undefined) starts[s] = i; });
  return { labels, series: realSeries, starts };
}

function renderReelNav(t) {
  const reelNav = document.getElementById("reelnav");
  if (!t) { reelNav.innerHTML = ""; reelNav.style.display = "none"; return; }
  const reels = normalizeReels(t);
  if (reels.length <= 1) { reelNav.innerHTML = ""; reelNav.style.display = "none"; return; }
  reelNav.style.display = "";
  const starCount = reels.filter(r => (r.html_label || r.label || "").includes("★")).length;
  const { labels, series, starts } = chipLabels(reels);
  reelNav.innerHTML = `
    <div class="playlist">
      <div class="pl-head">${esc(T().episodes)} <span class="pl-hint">${reels.length}${esc(T().unit)}${starCount ? ` · ★${starCount}` : ""}</span></div>
      <div class="pl-grid">` + reels.map((r, i) => {
        const raw = (r.html_label || r.label || "");
        const tip = raw.replace(/<[^>]+>/g, "").trim();
        const starred = raw.includes("★");
        /* 系列切换处插入整行换行分隔（第一个系列前不加） */
        const breakHtml = (i > 0 && series[i] && series[i] !== series[i - 1])
          ? `<div class="pl-break" title="${esc(series[i])}"></div>` : "";
        return breakHtml + `
        <button class="pl-chip ${i === ACTIVE_REEL ? "active" : ""} ${starred ? "starred" : ""}" data-i="${i}" title="${esc((starred ? "★ " : "") + tip)}">
          ${starred ? `<span class="pl-star">★</span>` : ""}
          ${i === ACTIVE_REEL
            ? `<svg viewBox="0 0 16 16" class="pl-eq"><path d="M3 6v4M6.5 4v8M10 5.5v5M13 6v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"><animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M3 6v4M6.5 3.5v9M10 6v4M13 5v6;M3 5v6M6.5 6v4M10 3.5v9M13 7v2;M3 6v4M6.5 3.5v9M10 6v4M13 5v6"/></animate></svg>`
            : labels[i]}
        </button>`;
      }).join("") + `</div></div>`;

  /* 当前片段自动滚进可视区 */
  reelNav.querySelector(".pl-chip.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/* ---------- 自定义控制条 ---------- */

function fmtTime(s) {
  if (!isFinite(s)) return "0:00";
  s = Math.floor(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- 静态控制条：全局只绑定一次（bindControls 多次调用不叠加） ---------- */

/* 倍速菜单：只构建一次 */
let rateMenu = null;
function ensureRateMenu() {
  if (rateMenu) return rateMenu;
  rateMenu = document.createElement("div");
  rateMenu.id = "rate-menu";
  rateMenu.innerHTML = SPEEDS.map(r =>
    `<button class="rate-opt" data-r="${r}">${r}x</button>`).join("");
  document.body.appendChild(rateMenu);
  /* 点击页面其他地方关闭菜单 */
  document.addEventListener("click", e => {
    if (!rateMenu.contains(e.target) && !e.target.closest("#c-rate")) {
      rateMenu.classList.remove("open");
    }
  });
  /* 选项点击 → 应用倍速并持久化 */
  rateMenu.addEventListener("click", e => {
    const opt = e.target.closest(".rate-opt");
    if (!opt) return;
    PLAYBACK_RATE = Number(opt.dataset.r);
    const v = getStageVideo();
    if (v) v.playbackRate = PLAYBACK_RATE;
    syncRateButton();
    saveSettings();
    rateMenu.classList.remove("open");
  });
  return rateMenu;
}

/* 倍速按钮外观（不触碰视频，随时可调） */
function syncRateButton() {
  const btn = document.getElementById("c-rate");
  if (!btn) return;
  btn.textContent = PLAYBACK_RATE === 1 ? "1x" : `${PLAYBACK_RATE}x`;
  btn.classList.toggle("active", PLAYBACK_RATE !== 1);
  document.querySelectorAll("#rate-menu .rate-opt").forEach(o =>
    o.classList.toggle("on", Number(o.dataset.r) === PLAYBACK_RATE));
}

/* 静态按钮 + 键盘 + 菜单：一次性注册 */
let staticControlsBound = false;
function bindStaticControls() {
  if (staticControlsBound) return;
  staticControlsBound = true;
  const $ = id => document.getElementById(id);
  const btnPlay = $("c-play");
  const btnLoopOne = $("c-loop-one"), btnLoopAll = $("c-loop-all");
  const btnMute = $("c-mute");
  const btnPip = $("c-pip"), btnFull = $("c-full");
  const btnRate = $("c-rate");
  const stage = document.getElementById("stage");
  const menu = ensureRateMenu();

  /* 播放/暂停：操作当前视频 */
  btnPlay.addEventListener("click", () => {
    const v = getStageVideo();
    if (v) v.paused ? v.play() : v.pause();
  });

  /* 循环模式 */
  function applyLoop() {
    const v = getStageVideo();
    if (v) v.loop = LOOP_MODE === "one";
    btnLoopOne.classList.toggle("active", LOOP_MODE === "one");
    btnLoopAll.classList.toggle("active", LOOP_MODE === "all");
  }
  btnLoopOne.addEventListener("click", () => {
    LOOP_MODE = LOOP_MODE === "one" ? "off" : "one"; applyLoop(); saveSettings();
  });
  btnLoopAll.addEventListener("click", () => {
    LOOP_MODE = LOOP_MODE === "all" ? "off" : "all"; applyLoop(); saveSettings();
  });
  window.applyLoopMode = applyLoop;   // bindControls 每个新视频恢复循环态时调用

  /* 静音 */
  btnMute.addEventListener("click", () => {
    const v = getStageVideo();
    if (!v) return;
    v.muted = !v.muted;
    MUTED = v.muted;
    syncVolButton(v);
    saveSettings();
  });
  window.syncVolumeUI = () => syncVolButton(getStageVideo());

  /* 倍速按钮：开合菜单 */
  btnRate.addEventListener("click", e => {
    e.stopPropagation();
    menu.classList.toggle("open");
    syncRateButton();
    const r = btnRate.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, r.top - menu.offsetHeight - 8)}px`;
  });

  /* 画中画 / 全屏 */
  if (document.pictureInPictureEnabled) {
    btnPip.addEventListener("click", async () => {
      const v = getStageVideo();
      if (!v) return;
      try {
        document.pictureInPictureElement
          ? await document.exitPictureInPicture()
          : await v.requestPictureInPicture();
      } catch (e) { /* ignore */ }
    });
  } else {
    btnPip.style.display = "none";
  }
  btnFull.addEventListener("click", () => {
    (stage.fullscreenElement || stage === document.fullscreenElement)
      ? document.exitFullscreen()
      : stage.requestFullscreen();
  });

  /* 移动端双击舞台 = 播放/暂停 */
  stage.addEventListener("dblclick", e => {
    if (e.target.closest("video")) { e.preventDefault(); btnPlay.click(); }
  });

  /* 键盘快捷键：全局只注册一次，实时取当前视频 */
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    const video = getStageVideo();
    if (!video) return;
    switch (e.key) {
      case " ": e.preventDefault(); video.paused ? video.play() : video.pause(); break;
      case "ArrowLeft": video.currentTime = Math.max(0, video.currentTime - 5); break;
      case "ArrowRight": video.currentTime += 5; break;
      case "ArrowUp": e.preventDefault(); video.volume = Math.min(1, video.volume + .1); break;
      case "ArrowDown": e.preventDefault(); video.volume = Math.max(0, video.volume - .1); break;
      case "m": case "M": btnMute.click(); break;
      case "l": case "L": btnLoopOne.click(); break;
      case "f": case "F": btnFull.click(); break;
      case "0": video.currentTime = 0; break;
    }
  });
}

/* 当前舞台视频（reel 是图片时返回 null；控制条/快捷键实时取用） */
function getStageVideo() {
  return document.querySelector("#stage video");
}

/* 音量按钮外观 */
function syncVolButton(v) {
  const btnMute = document.getElementById("c-mute");
  const vol = document.getElementById("c-vol");
  if (!btnMute || !vol || !v) return;
  btnMute.classList.toggle("active", v.muted || v.volume === 0);
  vol.value = v.muted ? 0 : v.volume * 1000;
}

function bindControls(video) {
  const $ = id => document.getElementById(id);
  const bar = $("controls");
  const cur = $("c-cur"), dur = $("c-dur");
  const seek = $("c-seek"), buf = $("c-buf");
  const vol = $("c-vol");

  bindStaticControls();

  /* 播放/暂停图标 */
  const btnPlay = $("c-play");
  const iconPlay = btnPlay.querySelector(".ic-play");
  const iconPause = btnPlay.querySelector(".ic-pause");
  const syncPlay = () => {
    iconPlay.style.display = video.paused ? "" : "none";
    iconPause.style.display = video.paused ? "none" : "";
  };
  video.addEventListener("play", syncPlay);
  video.addEventListener("pause", syncPlay);

  /* 进度 + 缓冲 */
  const syncTime = () => {
    cur.textContent = fmtTime(video.currentTime);
    dur.textContent = fmtTime(video.duration);
    if (video.duration) seek.value = (video.currentTime / video.duration) * 1000;
    if (video.buffered.length) {
      const end = video.buffered.end(video.buffered.length - 1);
      if (video.duration) buf.style.width = `${(end / video.duration) * 100}%`;
    }
  };
  video.addEventListener("timeupdate", syncTime);
  video.addEventListener("loadedmetadata", syncTime);
  video.addEventListener("progress", syncTime);
  seek.addEventListener("input", () => {
    if (video.duration) video.currentTime = (seek.value / 1000) * video.duration;
  });
  seek.addEventListener("input", () => {
    const pct = video.duration ? (seek.value / 1000) * 100 : 0;
    seek.style.setProperty("--fill", `${pct}%`);
  });
  seek.style.setProperty("--fill", video.duration ? (video.currentTime / video.duration) * 100 + "%" : "0%");

  /* 音量滑杆 + 状态恢复（每个新视频一次） */
  vol.addEventListener("input", () => {
    video.muted = false;
    video.volume = vol.value / 1000;
    VOLUME = video.volume;
    MUTED = false;
    syncVolButton(video); saveSettings();
  });
  video.addEventListener("volumechange", () => syncVolButton(video));
  video.volume = VOLUME;
  video.muted = MUTED;
  syncVolButton(video);
  video.playbackRate = PLAYBACK_RATE;   // 新视频恢复倍速
  syncRateButton();                     // 菜单高亮同步
  window.applyLoopMode?.();             // 新视频恢复循环态

  bar.style.display = "";
  syncPlay(); syncTime();
}

/* 左侧测试项：事件委托绑定在 #testlist 容器上 */
document.getElementById("testlist").addEventListener("click", e => {
  const btn = e.target.closest(".testitem");
  if (!btn || btn.dataset.id === ACTIVE_ID) return;
  ACTIVE_ID = btn.dataset.id;
  ACTIVE_REEL = 0;
  renderList();
  renderStage();
});

/* 播放列表行：事件委托绑定在 #reelnav 容器上 */
document.getElementById("reelnav").addEventListener("click", e => {
  const btn = e.target.closest(".pl-chip");
  if (!btn) return;
  ACTIVE_REEL = Number(btn.dataset.i);
  renderStage();
});

/* ---------- 右侧剧场 ---------- */

function renderStage() {
  const t = currentTest();
  const stage = document.getElementById("stage");
  const bar = document.getElementById("stagebar");
  const detail = document.getElementById("detail");
  const controls = document.getElementById("controls");

  if (!t) {
    stage.innerHTML = `<div class="stage-hint">${esc(T().pick)}</div>`;
    bar.style.display = "none"; detail.style.display = "none";
    controls.style.display = "none";
    renderReelNav(t);
    return;
  }

  const reel = currentReel(t);
  if (reel.kind === "image") {
    stage.innerHTML = `<img src="${esc(reel.src)}" alt="">`;
    controls.style.display = "none";
  } else {
    stage.innerHTML = `<video id="stage-video" autoplay playsinline src="${esc(reel.src)}"${reel.poster ? ` poster="${esc(reel.poster)}"` : ""}></video>`;
    controls.style.display = "";
  }

  /* 比例保真监控（仅 console 日志，不影响界面显示） */
  const vid = stage.querySelector("video, img");
  if (vid) {
    const check = () => {
      const nw = vid.videoWidth || vid.naturalWidth;
      const nh = vid.videoHeight || vid.naturalHeight;
      const rw = vid.getBoundingClientRect().width;
      const rh = vid.getBoundingClientRect().height;
      if (!nw || !nh || !rw || !rh) return;
      const diff = Math.abs(nw / nh - rw / rh) / (nw / nh);
      if (diff > 0.01) console.warn(`[aspect-check] ${reel.src} 比例偏差 ${(diff * 100).toFixed(2)}%（native ${nw}x${nh} shown ${rw.toFixed(1)}x${rh.toFixed(1)}）`);
    };
    if (vid.tagName === "VIDEO") {
      vid.addEventListener("loadedmetadata", check, { once: true });
      vid.addEventListener("resize", check);
    } else if (vid.complete) {
      requestAnimationFrame(check);
    } else {
      vid.addEventListener("load", () => requestAnimationFrame(check), { once: true });
    }
  }

  if (reel.kind !== "image") {
    bindControls(stage.querySelector("video"));
  }

  renderReelNav(t);

  /* 标题条 */
  bar.style.display = "";
  bar.innerHTML = `
    <div>
      <div class="st-title">${esc(t.title)}</div>
      <div class="st-summary">${esc(reel.html_label ? reel.html_label.replace(/<[^>]+>/g, "") : reel.label)} · ${esc(t.summary || "")}</div>
    </div>
    <div class="st-actions">
      <button class="st-btn" id="btn-open-file">${esc(T().open)}</button>
    </div>`;
  document.getElementById("btn-open-file").addEventListener("click", () => {
    window.open(`https://github.com/mafeis/ai-test-lab/blob/main/${reel.src.replace(/^\/?/, "")}`, "_blank");
  });

  /* 详情 */
  const badges = (t.tags || []).map(tag => {
    const [label, cls] = Array.isArray(tag) ? tag : [tag, ""];
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  }).join("");
  const rows = (t.stats || []).map(([k, v]) =>
    `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const points = (t.findings || []).map(p => `<li>${esc(p)}</li>`).join("");
  const links = (t.links || []).map(([label, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("");

  detail.style.display = "";
  detail.innerHTML = `
    <div class="d-head">
      <span class="d-cat" style="--cat-color: ${CATEGORY_COLORS[t.category] || "var(--accent)"}">${esc(t.category || T().uncat)}</span>
      ${badges}
    </div>
    ${rows ? `<div class="d-section"><div class="d-label">${esc(T().data)}</div><table>${rows}</table></div>` : ""}
    ${points ? `<div class="d-section"><div class="d-label">${esc(T().findings)}</div><ul>${points}</ul></div>` : ""}
    ${links ? `<div class="links">${links}</div>` : ""}`;
}

/* ---------- 筛选 ---------- */

function renderFilters() {
  const el = document.getElementById("filters");
  const groups = [...new Set(ALL_TESTS.map(t => t.category || T().uncat))];
  const cats = [ALL_CAT, ...groups];
  el.innerHTML = cats.map(c => {
    const n = c === ALL_CAT ? ALL_TESTS.length : ALL_TESTS.filter(t => (t.category || T().uncat) === c).length;
    return `<button class="chip ${c === ACTIVE_CAT ? "active" : ""}" data-cat="${esc(c)}">${esc(c === ALL_CAT ? T().all : c)}<span class="n">${n}</span></button>`;
  }).join("") + `<button class="chip lang-btn" id="lang-btn" title="Language / 语言">EN</button>`;
}

/* 顶部分类 chip + 语言切换：事件委托绑定在 #filters 容器上（重建按钮不丢事件） */
document.getElementById("filters").addEventListener("click", e => {
  const langBtn = e.target.closest("#lang-btn");
  if (langBtn) { setLang(LANG === "zh" ? "en" : "zh"); return; }
  const btn = e.target.closest(".chip");
  if (!btn) return;
  ACTIVE_CAT = btn.dataset.cat;
  const stillVisible = ALL_TESTS.some(t => t.id === ACTIVE_ID &&
    (ACTIVE_CAT === ALL_CAT || t.category === ACTIVE_CAT));
  if (!stillVisible) { ACTIVE_ID = null; renderStage(); }
  renderFilters();
  renderList();
});

/* ---------- 启动 ---------- */

async function boot() {
  try {
    applyStatic(); syncLangBtn();
    loadSettings();   // 恢复上次会话的播放器设置（音量/静音/倍速/循环）

    const manifest = await (await fetch("data/manifest.json", { cache: "no-store" })).json();
    const results = await Promise.all(manifest.tests.map(async path => {
      /* 英文界面优先取 <id>.en.json，缺失自动回退中文原文件 */
      const paths = LANG === "en" ? [path.replace(/\.json$/, ".en.json"), path] : [path];
      for (const p of paths) {
        try {
          const res = await fetch(p, { cache: "no-store" });
          if (res.ok) return await res.json();
        } catch (e) { /* 换下一个语言档 */ }
      }
      console.warn("skip broken test file:", path);
      return null;
    }));
    ALL_TESTS = results.filter(Boolean);

    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hash && ALL_TESTS.some(t => t.id === hash)) ACTIVE_ID = hash;
    else if (ALL_TESTS.length) ACTIVE_ID = ALL_TESTS[0].id;

    renderFilters(); syncLangBtn();
    renderList();
    renderStage();
  } catch (e) {
    document.getElementById("stage").innerHTML =
      `<div class="stage-hint">${esc(T().loadFail)}：${esc(e.message)}</div>`;
  }
}

boot();
