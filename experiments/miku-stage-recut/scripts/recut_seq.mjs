// 初音舞台线精剪前置分析（旗袍 qseq 同款方法，镜头表参数化）:
//  node miku_seq.mjs <tag> <shot1,shot2,...>
//  12fps/40x52 灰度解码 -> 基线 + 尾->首矩阵 + 尾2.5s×首2.5s全对扫描 + 能量曲线
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const FP = process.env.FFPROBE || "ffprobe";
const TAG = process.argv[2];
const SHOTS = (process.argv[3] || "").split(",").filter(Boolean);
if (!TAG || !SHOTS.length) { console.error("用法: node miku_seq.mjs <tag> <shot1,shot2,...>"); process.exit(1); }
const OUT = `cut/mseq/${TAG}`;
fs.mkdirSync(OUT, { recursive: true });

const FPS = 12, W = 40, H = 52;
const dur = (f) => Number(execFileSync(FP, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
function decode(src, tag) {
  const dir = `${OUT}/${tag}`;
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(`${dir}/f0000.raw`)) {
    execFileSync(FF, ["-v", "error", "-y", "-i", src, "-vf", `fps=${FPS},scale=${W}:${H}`, "-pix_fmt", "gray", `${dir}/f%04d.raw`]);
  }
  return fs.readdirSync(dir).filter((f) => f.endsWith(".raw")).sort().map((f) => fs.readFileSync(`${dir}/${f}`));
}
function mad(a, b) { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]); return s / n; }

const S = [];
for (const s of SHOTS) {
  const src = `videos/${s}_00001_.mp4`;
  if (!fs.existsSync(src)) { console.error("缺文件:", src); continue; }
  S.push({ s, src, fr: decode(src, s), d: dur(src) });
}
console.log(`[${TAG}] 镜头时长:`, S.map((x) => `${x.s.replace("story2_", "2:").replace("story_", "1:")}=${x.d.toFixed(2)}s/${x.fr.length}帧`).join("  "));

let base = 0, bn = 0;
for (const x of S) for (let i = 1; i < x.fr.length; i++) { base += mad(x.fr[i - 1], x.fr[i]); bn++; }
const BASE = base / bn;
console.log(`运动基线 = ${BASE.toFixed(2)}\n`);

console.log("尾帧 -> 首帧 差矩阵:");
const short = (s) => s.replace("story2_", "s2:").replace("story_", "s1:");
console.log("        " + S.map((x) => short(x.s).slice(-8).padStart(9)).join(""));
for (const A of S) {
  const row = S.map((B) => (A === B ? "        -" : mad(A.fr[A.fr.length - 1], B.fr[0]).toFixed(2).padStart(9)));
  console.log(short(A.s).slice(-8).padEnd(8) + row.join(""));
}

console.log("\n最优接点 (尾2.5s × 首2.5s, 全部有序对):");
const WIN = Math.round(2.5 * FPS);
const pairs = [];
for (const A of S) for (const B of S) {
  if (A === B) continue;
  let best = null;
  const from = Math.max(0, A.fr.length - WIN);
  const toB = Math.min(B.fr.length, WIN);
  for (let i = from; i < A.fr.length; i++) for (let j = 0; j < toB; j++) {
    const d = mad(A.fr[i], B.fr[j]);
    if (!best || d < best.d) best = { d, ai: i, bj: j };
  }
  pairs.push({ a: A.s, b: B.s, d: +best.d.toFixed(2), ta: +(best.ai / FPS).toFixed(2), tb: +(best.bj / FPS).toFixed(2) });
}
pairs.sort((x, y) => x.d - y.d);
for (const p of pairs.slice(0, 16)) {
  console.log(`  ${short(p.a)} -> ${short(p.b)}  差=${String(p.d).padStart(6)}  A留到${p.ta}s, B从${p.tb}s起${p.d < BASE ? "  <= 低于基线" : ""}`);
}

console.log("\n能量曲线 (#静态 <0.6x, *正常, @剧烈 >3x, 每格0.5s):");
for (const x of S) {
  const e = [];
  for (let t = 0; t + FPS / 2 <= x.fr.length; t += FPS / 2) {
    let s = 0, n = 0;
    for (let i = Math.max(1, t); i < Math.min(x.fr.length, t + FPS / 2); i++) { s += mad(x.fr[i - 1], x.fr[i]); n++; }
    e.push(n ? s / n : 0);
  }
  console.log(`  ${short(x.s).padEnd(12)} ${e.map((v) => (v < BASE * 0.6 ? "#" : v > BASE * 3 ? "@" : "*")).join("")}`);
  console.log(`               ${e.map((v) => v.toFixed(1)).join(" ")}`);
}
fs.writeFileSync(`${OUT}/pairs.json`, JSON.stringify({ BASE, pairs }, null, 1), "utf8");
console.log(`\n-> ${OUT}/pairs.json`);
