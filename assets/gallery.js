/* ============================================================
   AI Image Lab · 图片测试页独立渲染器（数据驱动）
   读 data/images-manifest.json → data/image-tests/*.json
   与视频播放页（assets/app.js）完全分离
   ============================================================ */

/* 全局错误可见化（与播放页同款） */
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

const CATEGORY_COLORS = {
  "图像生成": "var(--c-image)",
  "参数扫描": "var(--c-sweep)",
  "视频生成": "var(--c-video)",
  "Agent 任务": "var(--c-agent)",
};
const DEFAULT_COLOR = "var(--c-image)";

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- 状态 ---------- */
let ALL_TESTS = [];
let ACTIVE_CAT = "全部";
let ACTIVE_ID = null;

/* ---------- 数据加载 ---------- */
async function loadAll() {
  const man = await fetch(`data/images-manifest.json?v=${Date.now()}`).then(r => r.json());
  const results = await Promise.allSettled(
    man.tests.map(p => fetch(`${p}?v=${Date.now()}`).then(r => r.json()))
  );
  ALL_TESTS = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn("跳过坏数据文件:", man.tests[i], r.reason);
  });
}

/* ---------- 渲染：分类 chips ---------- */
function renderFilters() {
  const cats = ["全部", ...new Set(ALL_TESTS.map(t => t.category).filter(Boolean))];
  const el = document.getElementById("filters");
  el.innerHTML = cats.map(c => {
    const n = c === "全部" ? ALL_TESTS.length : ALL_TESTS.filter(t => t.category === c).length;
    return `<button class="chip ${c === ACTIVE_CAT ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}<span class="n">${n}</span></button>`;
  }).join("");
}

/* ---------- 渲染：右侧清单 ---------- */
function renderList() {
  const list = ALL_TESTS.filter(t => ACTIVE_CAT === "全部" || t.category === ACTIVE_CAT);
  const el = document.getElementById("testlist");
  el.innerHTML = list.map(t => {
    const color = CATEGORY_COLORS[t.category] || DEFAULT_COLOR;
    return `
    <div class="test-row ${t.id === ACTIVE_ID ? "active" : ""}" data-id="${esc(t.id)}">
      <div class="t-title"><span class="t-dot" style="background:${color}"></span>${esc(t.title)}</div>
      <div class="t-sum">${esc(t.summary || "")}</div>
    </div>`;
  }).join("");
}

/* ---------- 渲染：对比滑杆卡片 ---------- */
function renderCompareCard(item) {
  const versions = item.versions || {};
  const modes = item.modes || [];
  const first = modes[0]?.pair || Object.keys(versions).slice(0, 2);
  const [lk, rk] = first;
  const L = versions[lk], R = versions[rk];
  const dataImgs = JSON.stringify(Object.fromEntries(
    Object.entries(versions).map(([k, v]) => [k, v.src])
  ));

  const modeBtns = modes.map((m, i) =>
    `<button class="mode-btn ${i === 0 ? "active" : ""}" data-l="${esc(m.pair[0])}" data-r="${esc(m.pair[1])}">${esc(m.label)}</button>`
  ).join("");

  const zoomBtns = [
    ["fit", "适应窗口"], ["full-h", "满高"], ["1", "100%"], ["2", "200%"]
  ].map(([z, lb], i) =>
    `<button class="mode-btn zoom-btn ${i === 0 ? "active" : ""}" data-zoom="${z}">${lb}</button>`
  ).join("");

  return `
  <div class="cmp-card" data-cmp-card>
    <div class="cmp-head">
      <div class="cmp-title">${item.label || ""}</div>
      <div class="modes">${modeBtns}</div>
    </div>
    <div class="cmp fit" data-cmp data-imgs='${esc(dataImgs)}'>
      <div class="cmp-inner">
        <img class="base" src="${esc(L.src)}" alt="左图层" draggable="false">
        <div class="after"><img src="${esc(R.src)}" alt="右图层" draggable="false"></div>
        <span class="tag l">${esc(L.label)}</span>
        <span class="tag r">${esc(R.label)}</span>
        <div class="divider"></div>
        <div class="handle">◀ ▶</div>
        <div class="loading">大图加载中…</div>
      </div>
    </div>
    <div class="cmp-foot">
      <div class="zoom-bar"><span class="zoom-label">缩放</span>${zoomBtns}</div>
      <span class="zoom-tip">放大后在右侧缩略导航上拖动橙框定位；对比线拖动照常</span>
    </div>
    ${item.hint ? `<p class="hint">${esc(item.hint)}</p>` : ""}
  </div>`;
}

/* ---------- 渲染：详情面板 ---------- */
function renderViewer() {
  const t = ALL_TESTS.find(x => x.id === ACTIVE_ID);
  const el = document.getElementById("viewer");
  if (!t) { el.innerHTML = ""; return; }

  const m = t.media || {};
  let html = "";

  if (m.type === "compare-gallery") {
    html += (m.items || []).map(renderCompareCard).join("");
    if (m.singles?.length) {
      html += `<div class="cmp-card"><div class="sec-title">生成原图（两模型并排）</div><div class="singles">${
        m.singles.map(s => `
          <figure>
            <img src="${esc(s.src)}" alt="${esc(s.label || "")}" loading="lazy">
            <figcaption>${esc(s.label || "")}</figcaption>
          </figure>`).join("")
      }</div></div>`;
    }
  }

  el.innerHTML = html;
  bindSliders();
  bindModeButtons();
  ensureMinimap();
  document.querySelectorAll("[data-cmp]").forEach(c => { bindZoom(c.closest("[data-cmp-card]")); bindImgNav(c); });
  pickActiveBox();
}

/* ---------- 渲染：详情面板 ---------- */
function renderDetail() {
  const t = ALL_TESTS.find(x => x.id === ACTIVE_ID);
  const el = document.getElementById("detail");
  if (!t) { el.style.display = "none"; el.innerHTML = ""; return; }

  const tags = (t.tags || []).map(([label, cls]) =>
    `<span class="badge ${esc(cls || "blue")}">${esc(label)}</span>`).join("");
  const stats = (t.stats || []).map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const findings = (t.findings || []).map(f => `<li>${esc(f)}</li>`).join("");
  const links = (t.links || []).map(([label, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("");

  el.innerHTML = `
    <h3>${esc(t.title)}</h3>
    <div class="d-summary">${esc(t.summary || "")} · ${esc(t.date || "")}</div>
    <div class="tags">${tags}</div>
    ${stats ? `<table><tbody>${stats}</tbody></table>` : ""}
    ${findings ? `<ul class="findings">${findings}</ul>` : ""}
    ${links ? `<div class="links">${links}</div>` : ""}`;
  el.style.display = "block";
}

/* ---------- 交互：滑杆（clip-path 裁切，图片不动） ---------- */
function bindSliders() {
  document.querySelectorAll("[data-cmp]").forEach(box => {
    const inner = box.querySelector(".cmp-inner");
    const after = box.querySelector(".after");
    const divider = box.querySelector(".divider");
    const handle = box.querySelector(".handle");
    function setPct(clientX) {
      const r = inner.getBoundingClientRect();
      const pct = Math.min(100, Math.max(0, (clientX - r.left) / r.width * 100));
      after.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      divider.style.left = pct + "%";
      handle.style.left = pct + "%";
    }
    let dragging = false;
    const down = e => { e.preventDefault(); dragging = true; setPct(e.touches ? e.touches[0].clientX : e.clientX); };
    const move = e => { if (dragging) { e.preventDefault(); setPct(e.touches ? e.touches[0].clientX : e.clientX); } };
    const up = () => { dragging = false; };
    box.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    box.addEventListener("touchstart", down, { passive: false });
    box.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    after.style.clipPath = "inset(0 50% 0 0)";
  });
}

/* ---------- 全局缩略图导航（钉在屏幕右侧，自动跟随当前可见的图） ---------- */
const MM = { el: null, vp: null, img: null, rect: null, box: null, raf: 0 };

function ensureMinimap() {
  if (MM.el) return;
  MM.el = document.createElement("div");
  MM.el.id = "imgminimap";
  MM.el.innerHTML = `
    <div class="minimap-title">图片导航</div>
    <div class="minimap-viewport"><img class="minimap-img" alt="缩略导航" draggable="false"><div class="minimap-rect"></div></div>`;
  document.body.appendChild(MM.el);
  MM.vp = MM.el.querySelector(".minimap-viewport");
  MM.img = MM.el.querySelector(".minimap-img");
  MM.rect = MM.el.querySelector(".minimap-rect");

  // 点/拖 minimap 定位当前图：以视口框中心对齐点击点
  let dragging = false;
  function navTo(clientX, clientY) {
    const box = MM.box;
    if (!box) return;
    const r = MM.vp.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    box.scrollLeft = px * box.scrollWidth - box.clientWidth / 2;
    box.scrollTop = py * box.scrollHeight - box.clientHeight / 2;
  }
  MM.vp.addEventListener("mousedown", e => { dragging = true; e.preventDefault(); navTo(e.clientX, e.clientY); });
  window.addEventListener("mousemove", e => { if (dragging) navTo(e.clientX, e.clientY); });
  window.addEventListener("mouseup", () => { dragging = false; });
  MM.vp.addEventListener("touchstart", e => { dragging = true; navTo(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  MM.vp.addEventListener("touchmove", e => { if (dragging) navTo(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener("touchend", () => { dragging = false; });

  // 页面滚动 → 切换跟随的图
  window.addEventListener("scroll", () => {
    if (MM.raf) return;
    MM.raf = requestAnimationFrame(() => { MM.raf = 0; pickActiveBox(); });
  }, { passive: true });
}

function pickActiveBox() {
  const boxes = [...document.querySelectorAll("[data-cmp]")];
  if (!boxes.length) { MM.el.style.display = "none"; return; }
  const vh = window.innerHeight;
  let best = null, bestArea = 0;
  boxes.forEach(b => {
    const r = b.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (visible > bestArea) { bestArea = visible; best = b; }
  });
  if (!best || bestArea < 80) { MM.el.style.display = "none"; return; }
  if (MM.box !== best) {
    MM.box = best;
    MM.img.src = best.querySelector(".base").src;
  }
  updateMinimapRect();
}

function updateMinimapRect() {
  const box = MM.box;
  if (!box) return;
  const sh = box.scrollHeight, vh = box.clientHeight;
  const sw = box.scrollWidth, vw = box.clientWidth;
  if (sh <= vh + 4 && sw <= vw + 4) { MM.el.style.display = "none"; return; }   // 没溢出隐藏
  MM.el.style.display = "block";
  const topPct = sh > vh ? box.scrollTop / sh : 0;
  const hPct = Math.min(1, vh / sh);
  const leftPct = sw > vw ? box.scrollLeft / sw : 0;
  const wPct = Math.min(1, vw / sw);
  MM.rect.style.top = (topPct * 100) + "%";
  MM.rect.style.left = (leftPct * 100) + "%";
  MM.rect.style.height = (hPct * 100) + "%";
  MM.rect.style.width = (wPct * 100) + "%";
}

function bindImgNav(box) {
  // 图片容器滚动 → 若它是当前活跃图，刷新橙框
  box.addEventListener("scroll", () => {
    if (box !== MM.box) return;
    if (MM.raf) return;
    MM.raf = requestAnimationFrame(() => { MM.raf = 0; updateMinimapRect(); });
  }, { passive: true });
  box.addEventListener("zoomed", () => { if (box === MM.box) setTimeout(updateMinimapRect, 50); });
}

/* ---------- 交互：缩放（适应/满高/100%/200%，超窗滚动） ---------- */
function bindZoom(card) {
  const box = card.querySelector("[data-cmp]");
  const base = box.querySelector(".base");
  const afterImg = box.querySelector(".after img");
  const zoomBtns = card.querySelectorAll(".zoom-btn");

  function apply(zoom) {
    zoomBtns.forEach(b => b.classList.toggle("active", b.dataset.zoom === zoom));
    box.classList.remove("fit", "full-h");
    if (zoom === "fit") { box.classList.add("fit"); base.style.width = ""; afterImg.style.width = ""; }
    else if (zoom === "full-h") { box.classList.add("full-h"); base.style.width = ""; afterImg.style.width = ""; }
    else {
      const scale = parseFloat(zoom);
      if (!isFinite(scale)) return;
      const w = Math.round(base.naturalWidth * scale);
      if (!w) return;   // 图片还没加载完，等 load 后再点
      base.style.width = w + "px";
      afterImg.style.width = w + "px";
    }
    box.scrollTop = 0;                       // 缩放后回到顶部，导航指示同步刷新
    box.dispatchEvent(new Event("zoomed"));
  }
  zoomBtns.forEach(b => b.addEventListener("click", () => apply(b.dataset.zoom)));
  base.addEventListener("load", () => {
    const active = card.querySelector(".zoom-btn.active");
    if (active && active.dataset.zoom !== "fit" && active.dataset.zoom !== "full-h") apply(active.dataset.zoom);
  });
}

/* ---------- 交互：档位切换（预加载大图防闪白） ---------- */
function bindModeButtons() {
  document.querySelectorAll("[data-cmp-card]").forEach(card => {
    const box = card.querySelector("[data-cmp]");
    const imgs = JSON.parse(box.dataset.imgs);
    const loading = box.querySelector(".loading");
    const cache = {};

    function preload(src) {
      if (cache[src] !== undefined) return Promise.resolve();
      return new Promise(res => {
        const im = new Image();
        im.onload = im.onerror = () => { cache[src] = true; res(); };
        im.src = src;
      });
    }

    card.querySelectorAll(".modes .mode-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!btn.dataset.l || !btn.dataset.r) return;   // 缩放按钮没有 pair，跳过
        card.querySelectorAll(".modes .mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const L = imgs[btn.dataset.l], R = imgs[btn.dataset.r];
        loading.classList.add("show");
        await Promise.all([preload(L), preload(R)]);
        loading.classList.remove("show");
        box.querySelector(".base").src = L;
        box.querySelector(".after img").src = R;
        // 角标文案：从 versions 的 label 取
        const item = currentVersions(card);
        box.querySelector(".tag.l").textContent = item?.[btn.dataset.l]?.label || "";
        box.querySelector(".tag.r").textContent = item?.[btn.dataset.r]?.label || "";
        // 换图后按当前缩放档重算尺寸
        const za = card.querySelector(".zoom-btn.active");
        if (za) za.click();
      });
    });
  });
}

/* 从当前测试数据里取 versions（含 label） */
function currentVersions(card) {
  const t = ALL_TESTS.find(x => x.id === ACTIVE_ID);
  if (!t?.media?.items) return null;
  const idx = [...document.querySelectorAll("[data-cmp-card]")].indexOf(card);
  return t.media.items[idx]?.versions || null;
}

/* ---------- 事件委托：chips / 列表行 ---------- */
document.getElementById("filters").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  ACTIVE_CAT = chip.dataset.cat;
  renderFilters(); renderList();
});

document.getElementById("testlist").addEventListener("click", e => {
  const row = e.target.closest(".test-row");
  if (!row) return;
  location.hash = row.dataset.id;
});

window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  const t = ALL_TESTS.find(x => x.id === id);
  if (t && t.id !== ACTIVE_ID) selectTest(id);
});

function selectTest(id) {
  ACTIVE_ID = id;
  renderList(); renderViewer(); renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 启动 ---------- */
(async function init() {
  await loadAll();
  renderFilters(); renderList();
  const hash = location.hash.slice(1);
  if (hash && ALL_TESTS.some(t => t.id === hash)) selectTest(hash);
  else if (ALL_TESTS.length) selectTest(ALL_TESTS[0].id);
})();
