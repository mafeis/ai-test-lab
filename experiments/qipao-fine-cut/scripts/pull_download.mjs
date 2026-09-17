// 步骤 0b · 批量下载：按清单从 ComfyUI 的 /view 取片，并发可控、已下完整文件跳过。
// 用法: COMFY_BASE=http://<comfyui-host>:8188 node experiments/qipao-fine-cut/scripts/pull_download.mjs \
//         [--in inventory.json] [--dest takes] [--concurrency 6] [--only <regex>] [--dry]
// 「跳过」判定用 HEAD 的 content-length 与本地体积比对，避免半截文件被当成已下载。
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.COMFY_BASE || "").replace(/\/$/, "");
if (!BASE) { console.error("请设置环境变量 COMFY_BASE，例如 http://<comfyui-host>:8188"); process.exit(1); }
const argv = process.argv.slice(2);
let infile = "inventory.json", dest = "takes", conc = 6, only = null, dry = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--in") infile = argv[++i];
  else if (argv[i] === "--dest") dest = argv[++i];
  else if (argv[i] === "--concurrency") conc = +argv[++i];
  else if (argv[i] === "--only") only = new RegExp(argv[++i], "i");
  else if (argv[i] === "--dry") dry = true;
}

let items = JSON.parse(fs.readFileSync(infile, "utf8"))
  .map((r) => ({ file: r.file, subfolder: r.subfolder, type: r.type || "output" }));
if (only) items = items.filter((it) => only.test(it.file));

// 同名文件可能被多次生成，按 subfolder/filename 去重
const seen = new Map();
for (const it of items) if (!seen.has(it.subfolder + "/" + it.file)) seen.set(it.subfolder + "/" + it.file, it);
items = [...seen.values()];

const viewUrl = (it) =>
  `${BASE}/view?` + new URLSearchParams({ filename: it.file, subfolder: it.subfolder, type: it.type });

fs.mkdirSync(dest, { recursive: true });

async function sizeOf(it) {
  try {
    const r = await fetch(viewUrl(it), { method: "HEAD" });
    if (!r.ok) return null;
    const n = +r.headers.get("content-length");
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch { return null; }
}

let okCount = 0, skipCount = 0, failCount = 0, totalBytes = 0;
const failList = [];

async function download(it) {
  const outPath = path.join(dest, it.file);
  const remote = await sizeOf(it);
  if (fs.existsSync(outPath)) {
    const local = fs.statSync(outPath).size;
    if (local > 0 && (remote === null || local === remote)) { skipCount++; return; }
  }
  if (dry) { console.log(`[dry] ${it.file} ${remote ? (remote / 1048576).toFixed(2) + "MB" : "?"}`); return; }
  const res = await fetch(viewUrl(it));
  if (!res.ok) { failCount++; failList.push(`${it.file}: HTTP ${res.status}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  okCount++; totalBytes += buf.length;
  console.log(`ok ${it.file} ${(buf.length / 1048576).toFixed(2)}MB`);
}

let idx = 0;
async function worker() {
  while (idx < items.length) {
    const it = items[idx++];
    try { await download(it); } catch (e) { failCount++; failList.push(`${it.file}: ${e.message}`); }
  }
}
await Promise.all(Array.from({ length: Math.min(conc, items.length) }, worker));

console.log(`\n共 ${items.length} 个唯一文件 · 下载 ${okCount} (${(totalBytes / 1048576).toFixed(1)}MB) · 跳过 ${skipCount} · 失败 ${failCount}`);
if (failList.length) console.log("失败列表:\n" + failList.join("\n"));
