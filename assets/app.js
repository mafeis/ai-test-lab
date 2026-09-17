/* ============================================================
   AI Test Lab · 通用渲染器（剧场模式）
   左侧列表 + 右侧共用大播放器；视频按原始宽高比 contain 显示
   数据在 data/tests/*.json，新增测试不用改这里
   ============================================================ */

/* 分类 → accent 色登记表（新分类在这里加一行色号即可） */
const CATEGORY_COLORS = {
  "视频生成": "var(--c-video)",
  "参数扫描": "var(--c-sweep)",
  "图像生成": "var(--c-image)",
  "Agent 任务": "var(--c-agent)",
};

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- 数据归一化 ----------
   把测试的 media 字段统一拆成「可切换的播放片段列表」reels：
   - video/image 单媒体 → 1 个片段
   - gallery → 每个窗口 1 个片段（分辨率扫描等）        */

function normalizeReels(t) {
  const m = t.media;
  if (!m) return [];
  if (m.type === "gallery") {
    return m.items.map((it, i) => ({
      kind: it.type || "video",
      src: it.src,
      poster: it.poster || "",
      label: it.label || `#${i + 1}`,
      html_label: it.label || "",   // gallery label 允许 <b>
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
let ACTIVE_ID = null;     // 当前剧场中的测试 id
let ACTIVE_REEL = 0;      // 当前片段索引

function currentTest() { return ALL_TESTS.find(t => t.id === ACTIVE_ID) || null; }
function currentReel(t) { const r = normalizeReels(t); return r[ACTIVE_REEL] || r[0] || null; }

/* ---------- 左侧列表 ---------- */

function renderList() {
  const el = document.getElementById("testlist");
  const visible = ALL_TESTS.filter(t => ACTIVE_CAT === "全部" || t.category === ACTIVE_CAT);
  el.innerHTML = visible.map(t => {
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
  }).join("") || `<div class="empty">该分类下暂无测试</div>`;

  el.querySelectorAll(".testitem").forEach(btn =>
    btn.addEventListener("click", () => {
      ACTIVE_ID = btn.dataset.id;
      ACTIVE_REEL = 0;
      renderList();
      renderStage();
    }));
}

/* ---------- 右侧剧场 ---------- */

function renderStage() {
  const t = currentTest();
  const stage = document.getElementById("stage");
  const bar = document.getElementById("stagebar");
  const detail = document.getElementById("detail");
  const reelNav = document.getElementById("reelnav");

  if (!t) {
    stage.innerHTML = `<div class="stage-hint">← 从左侧选择一个测试开始播放</div>`;
    bar.style.display = "none"; detail.style.display = "none"; reelNav.innerHTML = "";
    return;
  }

  const reel = currentReel(t);
  const inner = reel.kind === "image"
    ? `<img src="${esc(reel.src)}" alt="">`
    : `<video controls autoplay playsinline src="${esc(reel.src)}" poster="${esc(reel.poster)}"></video>`;
  stage.innerHTML = inner;

  /* 比例保真自检：加载后核对 舞台显示比例 vs 视频原始比例（8 位小数内一致即 PASS） */
  const vid = stage.querySelector("video, img");
  if (vid) {
    const check = () => {
      const nw = vid.videoWidth || vid.naturalWidth;
      const nh = vid.videoHeight || vid.naturalHeight;
      const rw = vid.getBoundingClientRect().width;
      const rh = vid.getBoundingClientRect().height;
      if (!nw || !nh || !rw || !rh) return false;
      const rSrc = nw / nh, rBox = rw / rh;
      const diff = Math.abs(rSrc - rBox) / rSrc;
      const ok = diff < 1e-8;
      console.log(`[aspect-check] ${reel.src} native ${nw}x${nh} (r=${rSrc.toFixed(6)}) shown ${rw.toFixed(1)}x${rh.toFixed(1)} (r=${rBox.toFixed(6)}) diff=${diff.toExponential(2)} ${ok ? "PASS" : "FAIL"}`);
      if (!ok) {
        vid.style.outline = "2px solid #dc2626";
        console.warn("[aspect-check] 显示比例与原始比例不一致，已标红");
      }
      return ok;
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

  /* gallery 型测试显示片段切换条 */
  const reels = normalizeReels(t);
  if (reels.length > 1) {
    reelNav.innerHTML = `<div class="reellist">` + reels.map((r, i) => `
      <button class="reel ${i === ACTIVE_REEL ? "active" : ""}" data-i="${i}">
        <span class="rbox">${r.poster ? `<img src="${esc(r.poster)}" alt="">` : `<video src="${esc(r.src)}" preload="metadata" muted></video>`}</span>
        <div class="rlabel">${r.html_label || esc(r.label)}</div>
      </button>`).join("") + `</div>`;
    reelNav.querySelectorAll(".reel").forEach(btn =>
      btn.addEventListener("click", () => {
        ACTIVE_REEL = Number(btn.dataset.i);
        renderStage();
      }));
  } else {
    reelNav.innerHTML = "";
  }

  /* 标题条 */
  bar.style.display = "";
  bar.innerHTML = `
    <div>
      <div class="st-title">${esc(t.title)}</div>
      <div class="st-summary">${esc(reel.html_label ? reel.html_label.replace(/<[^>]+>/g, "") : reel.label)} · ${esc(t.summary || "")}</div>
    </div>
    <div class="st-actions">
      <button class="st-btn" id="btn-open-file">在 GitHub 打开文件</button>
    </div>`;
  document.getElementById("btn-open-file").addEventListener("click", () => {
    const url = reel.src.replace(/^\/?/, "");
    window.open(`https://github.com/mafeis/ai-test-lab/blob/main/${url}`, "_blank");
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
      <span class="ti-cat" style="--cat-color: ${CATEGORY_COLORS[t.category] || "var(--accent)"}; font-size:11.5px; padding:1px 10px; border-radius:99px;">${esc(t.category || "未分类")}</span>
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
  el.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => {
      ACTIVE_CAT = btn.dataset.cat;
      const stillVisible = ALL_TESTS.some(t => t.id === ACTIVE_ID &&
        (ACTIVE_CAT === "全部" || t.category === ACTIVE_CAT));
      if (!stillVisible) { ACTIVE_ID = null; renderStage(); }
      renderFilters();
      renderList();
    }));
}

/* ---------- 启动 ---------- */

async function boot() {
  try {
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

    /* URL hash 定位：#h3-res-sweep 直达某测试 */
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
