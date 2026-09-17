/* ============================================================
   AI Test Lab · 通用渲染器
   数据在 data/tests/*.json，本文件是纯逻辑，新增测试不用改这里
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

/* ---------- 媒体渲染 ---------- */

function renderMedia(m) {
  if (!m) return "";
  if (m.type === "video") {
    return `<video controls preload="metadata" src="${esc(m.src)}" poster="${esc(m.poster || "")}"></video>`;
  }
  if (m.type === "image") {
    return `<img class="thumb" src="${esc(m.src)}" alt="${esc(m.alt || "")}">`;
  }
  if (m.type === "gallery") {
    const cols = m.columns || (m.items.length === 2 ? "two" : m.items.length >= 8 ? "four" : "");
    const cells = m.items.map(it => {
      const inner = it.type === "image"
        ? `<img src="${esc(it.src)}" alt="${esc(it.alt || "")}">`
        : `<video controls preload="metadata" src="${esc(it.src)}" poster="${esc(it.poster || "")}"></video>`;
      return `<div class="vcell">${inner}<div class="vlabel">${it.label || ""}</div></div>`;
    }).join("");
    return `<div class="vidgrid ${cols}">${cells}</div>`;
  }
  return "";
}

/* ---------- 卡片渲染 ---------- */

function renderCard(t) {
  const badges = (t.tags || []).map(tag => {
    const [label, cls] = Array.isArray(tag) ? tag : [tag, ""];
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  }).join("");

  const rows = (t.stats || []).map(([k, v]) =>
    `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");

  const points = (t.findings || []).map(p => `<li>${esc(p)}</li>`).join("");

  const links = (t.links || []).map(([label, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("");

  return `
  <article class="card" id="${esc(t.id || "")}">
    ${renderMedia(t.media)}
    <h3>${esc(t.title)}</h3>
    <p class="meta">${esc(t.summary || "")}</p>
    <div class="badges">${badges}</div>
    ${(rows.length || points.length || links.length) ? `
    <details class="info" open>
      <summary>测试详情（点击收起）</summary>
      ${rows ? `<table>${rows}</table>` : ""}
      ${points ? `<ul>${points}</ul>` : ""}
      ${links ? `<div class="links">${links}</div>` : ""}
    </details>` : ""}
  </article>`;
}

/* ---------- 分组 + 筛选 ---------- */

let ALL_TESTS = [];
let ACTIVE_CAT = "全部";

function groupTests() {
  const groups = [];
  const map = {};
  for (const t of ALL_TESTS) {
    const cat = t.category || "未分类";
    if (!map[cat]) { map[cat] = []; groups.push(cat); }
    map[cat].push(t);
  }
  return { groups, map };
}

function renderFilters() {
  const { groups } = groupTests();
  const el = document.getElementById("filters");
  const cats = ["全部", ...groups];
  el.innerHTML = cats.map(c => {
    const n = c === "全部" ? ALL_TESTS.length : groupTests().map[c].length;
    return `<button class="chip ${c === ACTIVE_CAT ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}<span class="n">${n}</span></button>`;
  }).join("");
  el.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => {
      ACTIVE_CAT = btn.dataset.cat;
      renderFilters();
      renderContent();
    }));
}

function renderContent() {
  const { groups, map } = groupTests();
  const root = document.getElementById("content");
  const cats = ACTIVE_CAT === "全部" ? groups : groups.filter(g => g === ACTIVE_CAT);

  if (!cats.length) {
    root.innerHTML = `<div class="empty">该分类下暂无测试</div>`;
    return;
  }

  root.innerHTML = cats.map(cat => `
    <section class="section" style="--sec-color: ${CATEGORY_COLORS[cat] || "var(--accent)"}">
      <div class="section-head">
        <h2>${esc(cat)}</h2>
        <span class="count">${map[cat].length} 个测试</span>
      </div>
      <div class="cardgrid">${map[cat].map(renderCard).join("")}</div>
    </section>`).join("");

  document.getElementById("subline").textContent =
    `共 ${ALL_TESTS.length} 个测试 · ${groups.length} 个分类 · 点击画面播放，点击分类 chip 筛选`;
}

/* ---------- 启动：读 manifest → 并发拉取所有测试 JSON ---------- */

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
    renderFilters();
    renderContent();
  } catch (e) {
    document.getElementById("content").innerHTML =
      `<div class="empty">数据加载失败：${esc(e.message)}（检查 data/manifest.json）</div>`;
  }
}

boot();
