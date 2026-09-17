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
  box.textContent = `⚠ JS 错误: ${e.message} @ ${e.filename?.split("/").pop()}:${e.lineno}`;
  setTimeout(() => box.remove(), 10000);
});

/* 分类 → accent 色登记表（新分类在这里加一行色号即可） */
const CATEGORY_COLORS = {
  "视频生成": "var(--c-video)",
  "参数扫描": "var(--c-sweep)",
  "图像生成": "var(--c-image)",
  "Agent 任务": "var(--c-agent)",
};

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4];

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
    label: "正片",
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
let ACTIVE_CAT = "全部";
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
    if (typeof s.rate === "number" && SPEEDS.includes(s.rate)) PLAYBACK_RATE = s.rate;
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

/* ---------- 左侧列表（测试清单，按分类分组） ---------- */

function renderList() {
  const el = document.getElementById("testlist");
  const visible = ALL_TESTS.filter(t => ACTIVE_CAT === "全部" || t.category === ACTIVE_CAT);
  if (!visible.length) {
    el.innerHTML = `<div class="empty">该分类下暂无测试</div>`;
    return;
  }
  /* 按 category 分组插入小标题；选了具体分类时只显示该组 */
  const groups = [...new Set(visible.map(t => t.category || "未分类"))];
  el.innerHTML = groups.map(cat => {
    const items = visible.filter(t => (t.category || "未分类") === cat).map(t => {
      const color = CATEGORY_COLORS[t.category] || "var(--accent)";
      const thumb = firstThumb(t);
      const media = thumb
        ? `<img src="${esc(thumb)}" alt="">`
        : `<video src="${esc((normalizeReels(t)[0] || {}).src || "")}" preload="metadata" muted></video>`;
      return `
      <button class="testitem ${t.id === ACTIVE_ID ? "active" : ""}" data-id="${esc(t.id)}"
              style="--cat-color: ${color}">
        <span class="thumb-box">${media}</span>
        <span class="ti-text">
          <span class="ti-cat">${esc(t.category || "未分类")}</span>
          <div class="ti-title">${esc(t.title)}</div>
          <div class="ti-meta">${esc(t.summary || "")}</div>
        </span>
      </button>`;
    }).join("");
    return (ACTIVE_CAT === "全部" ? `<div class="list-group-label">${esc(cat)}</div>` : "") + items;
  }).join("");

  /* 当前测试的项自动滚进可视区 */
  el.querySelector(".testitem.active")?.scrollIntoView({ block: "nearest" });
}

/* ---------- 片段播放列表（右侧栏内，当前测试的二级选择） ---------- */

function renderReelNav(t) {
  const reelNav = document.getElementById("reelnav");
  const reels = normalizeReels(t);
  if (!t || reels.length <= 1) { reelNav.innerHTML = ""; reelNav.style.display = "none"; return; }
  reelNav.style.display = "";
  reelNav.innerHTML = `
    <div class="playlist">
      <div class="pl-head">片段列表 · ${reels.length} 个 <span class="pl-hint">点击切换播放</span></div>
      <div class="pl-items">` + reels.map((r, i) => `
      <button class="pl-item ${i === ACTIVE_REEL ? "active" : ""}" data-i="${i}">
        <span class="pl-no">${i === ACTIVE_REEL
          ? `<svg viewBox="0 0 16 16" class="pl-eq"><path d="M3 6v4M6.5 4v8M10 5.5v5M10 5v6M13 6v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"><animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M3 6v4M6.5 3.5v9M10 6v4M13 5v6;M3 5v6M6.5 6v4M10 3.5v9M13 7v2;M3 6v4M6.5 3.5v9M10 6v4M13 5v6"/></animate></svg>`
          : `<span class="pl-num">${i + 1}</span>`}</span>
        <span class="pl-label">${r.html_label || esc(r.label)}</span>
        <span class="pl-state">${i === ACTIVE_REEL ? "播放中" : ""}</span>
      </button>`).join("") + `</div></div>`;

  /* 当前片段自动滚进可视区 */
  reelNav.querySelector(".pl-item.active")?.scrollIntoView({ block: "nearest" });
}

/* ---------- 自定义控制条 ---------- */

function fmtTime(s) {
  if (!isFinite(s)) return "0:00";
  s = Math.floor(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function bindControls(video) {
  const $ = id => document.getElementById(id);
  const bar = $("controls");
  const btnPlay = $("c-play");
  const iconPlay = btnPlay.querySelector(".ic-play");
  const iconPause = btnPlay.querySelector(".ic-pause");
  const cur = $("c-cur"), dur = $("c-dur");
  const seek = $("c-seek"), buf = $("c-buf");
  const btnLoopOne = $("c-loop-one"), btnLoopAll = $("c-loop-all");
  const btnRate = $("c-rate");
  const btnMute = $("c-mute"), vol = $("c-vol");
  const btnPip = $("c-pip"), btnFull = $("c-full");
  const stage = document.getElementById("stage");

  /* 播放/暂停 */
  const syncPlay = () => {
    iconPlay.style.display = video.paused ? "" : "none";
    iconPause.style.display = video.paused ? "none" : "";
  };
  btnPlay.addEventListener("click", () => video.paused ? video.play() : video.pause());
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

  /* 循环：单个 / 全部（gallery 顺序连播）/ 关 */
  function applyLoop() {
    video.loop = LOOP_MODE === "one";
    btnLoopOne.classList.toggle("active", LOOP_MODE === "one");
    btnLoopAll.classList.toggle("active", LOOP_MODE === "all");
  }
  btnLoopOne.addEventListener("click", () => {
    LOOP_MODE = LOOP_MODE === "one" ? "off" : "one"; applyLoop(); saveSettings();
  });
  btnLoopAll.addEventListener("click", () => {
    LOOP_MODE = LOOP_MODE === "all" ? "off" : "all"; applyLoop(); saveSettings();
  });
  video.addEventListener("ended", () => {
    if (LOOP_MODE !== "all") return;
    const t = currentTest();
    const reels = normalizeReels(t);
    if (reels.length > 1) {
      ACTIVE_REEL = (ACTIVE_REEL + 1) % reels.length;   // 循环全部：下一个片段，到尾回首
      renderStage();
    } else {
      const vis = ALL_TESTS.filter(x => ACTIVE_CAT === "全部" || x.category === ACTIVE_CAT);
      const idx = vis.findIndex(x => x.id === ACTIVE_ID);
      if (vis.length > 1) {
        ACTIVE_ID = vis[(idx + 1) % vis.length].id;     // 单片段测试：下一个测试
        ACTIVE_REEL = 0;
        renderList(); renderStage();
      }
    }
  });
  applyLoop();

  /* 倍速 */
  const syncRate = () => {
    video.playbackRate = PLAYBACK_RATE;
    btnRate.textContent = PLAYBACK_RATE === 1 ? "1x" : `${PLAYBACK_RATE}x`;
    btnRate.classList.toggle("active", PLAYBACK_RATE !== 1);
  };
  btnRate.addEventListener("click", () => {
    PLAYBACK_RATE = SPEEDS[(SPEEDS.indexOf(PLAYBACK_RATE) + 1) % SPEEDS.length] || 1;
    syncRate(); saveSettings();
  });
  syncRate();

  /* 音量（含持久化恢复） */
  const syncVol = () => {
    btnMute.classList.toggle("active", video.muted || video.volume === 0);
    vol.value = video.muted ? 0 : video.volume * 1000;
  };
  btnMute.addEventListener("click", () => {
    video.muted = !video.muted;
    MUTED = video.muted;
    syncVol(); saveSettings();
  });
  vol.addEventListener("input", () => {
    video.muted = false;
    video.volume = vol.value / 1000;
    VOLUME = video.volume;
    MUTED = false;
    syncVol(); saveSettings();
  });
  video.addEventListener("volumechange", syncVol);
  /* 恢复持久化的音量设置 */
  video.volume = VOLUME;
  video.muted = MUTED;
  syncVol();

  /* 画中画 / 全屏（能力检测，不支持就隐藏） */
  if (document.pictureInPictureEnabled) {
    btnPip.style.display = "";
    btnPip.addEventListener("click", async () => {
      try {
        document.pictureInPictureElement
          ? await document.exitPictureInPicture()
          : await video.requestPictureInPicture();
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

  /* 键盘快捷键：全局只注册一次（见下方 getStageVideo 代理） */

  /* 移动端双击舞台 = 播放/暂停 */
  stage.addEventListener("dblclick", e => {
    if (e.target.closest("video")) { e.preventDefault(); btnPlay.click(); }
  });

  bar.style.display = "";
  syncPlay(); syncTime();
}

/* 当前舞台视频的动态引用（快捷键/双击始终操作最新视频） */
function getStageVideo() { return document.querySelector("#stage video"); }

/* 键盘快捷键：全局注册一次，避免每次 bindControls 重复叠加 */
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
    case "m": case "M": video.muted = !video.muted; break;
    case "l": case "L": document.getElementById("c-loop-one")?.click(); break;
    case "f": case "F": document.getElementById("c-full")?.click(); break;
    case "0": video.currentTime = 0; break;
  }
});

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
  const btn = e.target.closest(".pl-item");
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
    stage.innerHTML = `<div class="stage-hint">← 从左侧选择一个测试开始播放</div>`;
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
    stage.innerHTML = `<video id="stage-video" autoplay playsinline src="${esc(reel.src)}" poster="${esc(reel.poster)}"></video>`;
    controls.style.display = "";
  }

  /* 比例保真自检 */
  const vid = stage.querySelector("video, img");
  if (vid) {
    const check = () => {
      const nw = vid.videoWidth || vid.naturalWidth;
      const nh = vid.videoHeight || vid.naturalHeight;
      const rw = vid.getBoundingClientRect().width;
      const rh = vid.getBoundingClientRect().height;
      if (!nw || !nh || !rw || !rh) return false;
      const diff = Math.abs(nw / nh - rw / rh) / (nw / nh);
      console.log(`[aspect-check] ${reel.src} native ${nw}x${nh} shown ${rw.toFixed(1)}x${rh.toFixed(1)} diff=${diff.toExponential(2)} ${diff < 1e-8 ? "PASS" : "FAIL"}`);
      if (diff >= 1e-8) vid.style.outline = "2px solid #dc2626";
      return diff < 1e-8;
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
      <button class="st-btn" id="btn-open-file">在 GitHub 打开</button>
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
      <span class="d-cat" style="--cat-color: ${CATEGORY_COLORS[t.category] || "var(--accent)"}">${esc(t.category || "未分类")}</span>
      ${badges}
    </div>
    ${rows ? `<div class="d-section"><div class="d-label">测试数据</div><table>${rows}</table></div>` : ""}
    ${points ? `<div class="d-section"><div class="d-label">结论与发现</div><ul>${points}</ul></div>` : ""}
    ${links ? `<div class="links">${links}</div>` : ""}`;
}

/* ---------- 筛选 ---------- */

function renderFilters() {
  const el = document.getElementById("filters");
  const groups = [...new Set(ALL_TESTS.map(t => t.category || "未分类"))];
  const cats = ["全部", ...groups];
  el.innerHTML = cats.map(c => {
    const n = c === "全部" ? ALL_TESTS.length : ALL_TESTS.filter(t => (t.category || "未分类") === c).length;
    return `<button class="chip ${c === ACTIVE_CAT ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}<span class="n">${n}</span></button>`;
  }).join("");
}

/* 顶部分类 chip：事件委托绑定在 #filters 容器上（重建按钮不丢事件） */
document.getElementById("filters").addEventListener("click", e => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  ACTIVE_CAT = btn.dataset.cat;
  const stillVisible = ALL_TESTS.some(t => t.id === ACTIVE_ID &&
    (ACTIVE_CAT === "全部" || t.category === ACTIVE_CAT));
  if (!stillVisible) { ACTIVE_ID = null; renderStage(); }
  renderFilters();
  renderList();
});

/* ---------- 启动 ---------- */

async function boot() {
  try {
    loadSettings();   // 恢复上次会话的播放器设置（音量/静音/倍速/循环）

    const manifest = await (await fetch("data/manifest.json", { cache: "no-store" })).json();
    const results = await Promise.all(manifest.tests.map(async path => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status);
        return await res.json();
      } catch (e) {
        console.warn("skip broken test file:", path, e);
        return null;
      }
    }));
    ALL_TESTS = results.filter(Boolean);

    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hash && ALL_TESTS.some(t => t.id === hash)) ACTIVE_ID = hash;
    else if (ALL_TESTS.length) ACTIVE_ID = ALL_TESTS[0].id;

    renderFilters();
    renderList();
    renderStage();
  } catch (e) {
    document.getElementById("stage").innerHTML =
      `<div class="stage-hint">数据加载失败：${esc(e.message)}（检查 data/manifest.json）</div>`;
  }
}

boot();
