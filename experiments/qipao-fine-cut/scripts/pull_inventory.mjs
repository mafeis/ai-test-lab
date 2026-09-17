// 步骤 0a · 取片清单：从 ComfyUI 的 /history 把所有视频输出连同生成参数落成一张表。
// 用法: COMFY_BASE=http://<comfyui-host>:8188 node experiments/qipao-fine-cut/scripts/pull_inventory.mjs [--out inventory.json]
//
// 两个必须知道的接口细节：
//  1) 视频文件在 outputs.<node>.images 里（animated 数组标记），不在 gifs / videos 键下；
//  2) /history 的 prompt 字段是数组 [number, prompt_id, nodeGraph, {}, {}]，节点图在第 3 项——
//     直接当对象遍历会静默拿到 SyncRoot 之类的垃圾字段。
import fs from "node:fs";

const BASE = (process.env.COMFY_BASE || "").replace(/\/$/, "");
if (!BASE) { console.error("请设置环境变量 COMFY_BASE，例如 http://<comfyui-host>:8188"); process.exit(1); }
const argv = process.argv.slice(2);
let out = "inventory.json";
for (let i = 0; i < argv.length; i++) if (argv[i] === "--out") out = argv[++i];

const hist = await (await fetch(`${BASE}/history?max_items=1000`, { signal: AbortSignal.timeout(120000) })).json();

/** /history 的 prompt 字段可能是数组，节点图是其中带 class_type 的那一项 */
function graphOf(promptField) {
  if (!promptField) return {};
  if (!Array.isArray(promptField)) return promptField;
  for (const item of promptField) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const vals = Object.values(item);
      if (vals.some((v) => v && typeof v === "object" && v.class_type)) return item;
    }
  }
  return {};
}

/** 挖文本与关键标量：最长的一段文本作为主 prompt */
function findTexts(promptField) {
  const texts = [], seeds = [], nums = {};
  for (const [nid, node] of Object.entries(graphOf(promptField))) {
    if (!node || !node.inputs) continue;
    for (const [k, v] of Object.entries(node.inputs)) {
      if (typeof v === "string" && v.length > 12) texts.push({ nid, cls: node.class_type, key: k, v });
      if ((k === "seed" || k === "noise_seed") && typeof v === "number") seeds.push(v);
      if (["length", "duration", "fps", "width", "height", "steps"].includes(k) && typeof v === "number") nums[k] = v;
    }
  }
  texts.sort((a, b) => b.v.length - a.v.length);
  return { texts, seeds, nums };
}

const tsOf = (rec) => {
  let t = 0;
  for (const msg of rec?.status?.messages || []) if (msg?.[1]?.timestamp) t = Math.max(t, msg[1].timestamp);
  return t;
};

const rows = [];
for (const [promptId, rec] of Object.entries(hist)) {
  const { texts, seeds, nums } = findTexts(rec.prompt);
  for (const [nid, o] of Object.entries(rec.outputs || {})) {
    for (const key of ["images", "gifs", "videos", "audio"]) {
      const arr = o?.[key];
      if (!Array.isArray(arr)) continue;
      for (const f of arr) {
        if (!/\.(mp4|webm|mov|mkv)$/i.test(f.filename || "")) continue;
        rows.push({
          prompt_id: promptId, file: f.filename, subfolder: f.subfolder || "", type: f.type,
          node: nid, ts: tsOf(rec),
          main_prompt: texts[0]?.v || "",
          all_texts: texts.map((t) => `${t.cls}.${t.key}: ${t.v}`).slice(0, 4),
          seeds, nums,
        });
      }
    }
  }
}

rows.sort((a, b) => a.ts - b.ts);
fs.writeFileSync(out, JSON.stringify(rows, null, 2), "utf8");
console.log(`共 ${rows.length} 个视频 -> ${out}`);
for (const r of rows) {
  console.log(`${new Date(r.ts).toISOString()} | ${r.file.padEnd(30)} | seed=${(r.seeds || []).join(",")} | ${(r.main_prompt || "").replace(/\s+/g, " ").slice(0, 70)}`);
}
