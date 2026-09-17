// 步骤 1 · 接点扫描：为「N 条同 prompt take 精剪成一条」找出可用的下刀时刻。
// 在仓库根目录执行：node experiments/qipao-fine-cut/scripts/cut_scan.mjs
// 依赖：ffmpeg / ffprobe（默认走 PATH，非 PATH 场景用环境变量 FFMPEG / FFPROBE 指定）
//
// 输出：
//   _work/qseq/<take>/*.raw          每条 take 的 12fps / 40x52 灰度帧（缓存，重跑不重复解码）
//   控制台                            基线 / 段尾->段首差矩阵 / 全组合最优接点 / 每段运动能量曲线
//   join_scan.json                   基线与全部有序对的扫描结果（已随本实验提交，可 diff 复核）
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const FP = process.env.FFPROBE || "ffprobe";
const DIR = "experiments/qipao-fine-cut";
const OUT = `${DIR}/_work/qseq`;

const FPS = 12, W = 40, H = 52;         // 40x52 灰度：噪声低、全组合扫描可承受
const TAKES = ["00273", "00274", "00275", "00276", "00277", "00278"];

function dur(f) {
  return Number(execFileSync(FP, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
}
/** 解码为灰度小帧（已解码过则直接复用） */
function decode(src, tag) {
  const dir = `${OUT}/${tag}`;
  fs.mkdirSync(dir, { recursive: true });
  const first = `${dir}/f0000.raw`;
  if (!fs.existsSync(first)) {
    execFileSync(FF, ["-v", "error", "-y", "-i", src, "-vf", `fps=${FPS},scale=${W}:${H}`, "-pix_fmt", "gray", `${dir}/f%04d.raw`]);
  }
  return fs.readdirSync(dir).filter((f) => f.endsWith(".raw")).sort().map((f) => fs.readFileSync(`${dir}/${f}`));
}
/** 平均绝对帧差：40x52 灰度帧之间的距离 */
function mad(a, b) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n;
}

const S = [];
for (const t of TAKES) {
  const src = `${DIR}/takes/take_${t}.mp4`;
  if (!fs.existsSync(src)) { console.error("缺文件:", src); continue; }
  S.push({ s: t, src, fr: decode(src, t), d: dur(src) });
}
console.log("段时长:", S.map((x) => `${x.s}=${x.d.toFixed(2)}s/${x.fr.length}帧`).join("  "));

// 镜头内相邻帧差 = 该素材的「真实运动基线」；接点差低于它 ≈ 肉眼难辨
let base = 0, bn = 0;
for (const x of S) for (let i = 1; i < x.fr.length; i++) { base += mad(x.fr[i - 1], x.fr[i]); bn++; }
const BASE = base / bn;
console.log(`镜头内相邻帧差基线 = ${BASE.toFixed(2)} (低于它 = 该切点接近不可见)\n`);

console.log("段尾帧 -> 段首帧 差矩阵:");
console.log("        " + S.map((x) => x.s.padStart(7)).join(""));
for (const A of S) {
  const row = S.map((B) => (A === B ? "      -" : mad(A.fr[A.fr.length - 1], B.fr[0]).toFixed(2).padStart(7)));
  console.log(A.s.padEnd(8) + row.join(""));
}

// 全组合扫描：每条尾 2.5s × 每条首 2.5s，找有序对的最优接点与时刻
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
  pairs.push({ a: A.s, b: B.s, d: best.d, ta: best.ai / FPS, tb: best.bj / FPS });
}
pairs.sort((x, y) => x.d - y.d);
for (const p of pairs) {
  const flag = p.d < BASE ? "  <= 低于基线" : "";
  console.log(`  ${p.a} -> ${p.b}  差=${p.d.toFixed(2).padStart(6)} (${(p.d / BASE).toFixed(2)}x)  A留到${p.ta.toFixed(2)}s, B从${p.tb.toFixed(2)}s起${flag}`);
}

// 运动能量曲线：标出静态头尾（待机动作用来下刀，不进入成片）
console.log("\n每段运动能量 (每0.5s一格, #=静态 <0.6*基线, *=正常, @=剧烈 >3*基线):");
for (const x of S) {
  const e = [];
  for (let t = 0; t + FPS / 2 <= x.fr.length; t += FPS / 2) {
    let s = 0, n = 0;
    for (let i = Math.max(1, t); i < Math.min(x.fr.length, t + FPS / 2); i++) { s += mad(x.fr[i - 1], x.fr[i]); n++; }
    e.push(n ? s / n : 0);
  }
  console.log(`  ${x.s}  ${e.map((v) => (v < BASE * 0.6 ? "#" : v > BASE * 3 ? "@" : "*")).join("")}`);
  console.log(`         ${e.map((v) => v.toFixed(1)).join(" ")}`);
}

fs.writeFileSync(`${DIR}/join_scan.json`, JSON.stringify({ BASE, pairs }, null, 1), "utf8");
console.log(`\n基线与接点数据已写入 ${DIR}/join_scan.json`);
