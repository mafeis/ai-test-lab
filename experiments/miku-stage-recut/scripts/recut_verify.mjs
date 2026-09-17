// 精剪成片验证: node miku_verify.mjs <cel|real>
//  A) 数值: 解码整片 12fps/40x52 灰度, 每个接点窗口内最大邻帧差 vs 全片基线
//  B) 目检: joins.jpg 每刀前后帧横排(24fps); overview.jpg 整片 1fps 连拍
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const FP = process.env.FFPROBE || "ffprobe";
const TAG = process.argv[2];
const dur = (f) => Number(execFileSync(FP, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
const V = (s) => `videos/${s}_00001_.mp4`;

const CFG = {
  cel: {
    out: "merged/recut_cel.mp4",
    segs: [
      ["story2_shot2", 0, 5.083],
      ["story2_shot3", 0.08, 5.083, [[0.08, 1.15, 1], [1.15, 1.45, 1.5], [1.45, 3.6, 2.7], [3.6, 3.9, 1.5], [3.9, 5.083, 1]]],
      ["story2_shot4", 0, 5.0, [[0, 2.5, 1], [2.5, 5.0, 1.5]]],
      ["story2_shot5", 0, 4.25, [[0, 2.2, 1], [2.2, 4.25, 1.5]]],
      ["story2_shot6"], ["story_shot1"],
    ],
    xfs: [0.25, 0, 0, 0, 0.5],
  },
  real: {
    out: "merged/recut_real.mp4",
    segs: [
      ["story2_shot2fix", 1.3, 3.0],
      ["story_shot2"],
      ["story_shot3", 0, undefined, [[0, 0.5, 1], [0.5, 0.8, 1.5], [0.8, 3.2, 2.7], [3.2, 3.6, 1.5], [3.6, dur(V("story_shot3")), 1.35]]],
      ["story_shot4", 0, 5.083, [[0, 2.5, 1], [2.5, 5.083, 1.5]]],
      ["story_shot5", 0, 5.083, [[0, 1.6, 1], [1.6, 5.083, 1.5]]],
      ["story_shot6"],
    ],
    xfs: [0.35, 0.35, 0.35, 0, 0],
  },
}[TAG];
if (!CFG) { console.error("tag?"); process.exit(1); }
const LENS = CFG.segs.map((s) => s[3] ? s[3].reduce((t, [a, b, k]) => t + (b - a) / k, 0) : (s[2] !== undefined ? s[2] - (s[1] || 0) : dur(V(s[0]))));

// 时间线模拟: 返回每刀的接点中心时刻
const joints = [];
let acc = LENS[0];
for (let i = 1; i < CFG.segs.length; i++) {
  const d = CFG.xfs[i - 1];
  joints.push({ t: +(acc - d / 2).toFixed(3), d });
  acc += LENS[i] - d;
}
console.log(`[${TAG}] ${CFG.out}  时长 ${dur(CFG.out).toFixed(2)}s  理论 ${acc.toFixed(2)}s`);
console.log("接点:", joints.map((j) => `${j.t}s(${j.d ? "溶解" + j.d : "硬接"})`).join("  "));

// A) 数值验证
const OUT = `cut/mverify/${TAG}`;
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(`${OUT}/f0000.raw`)) {
  execFileSync(FF, ["-v", "error", "-y", "-i", CFG.out, "-vf", "fps=24,scale=40:52", "-pix_fmt", "gray", `${OUT}/f%04d.raw`]);
}
const fr = fs.readdirSync(OUT).filter((f) => f.endsWith(".raw")).sort().map((f) => fs.readFileSync(`${OUT}/${f}`));
const mad = (a, b) => { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]); return s / n; };
const FP24 = 24;
const diffs = [];
for (let i = 1; i < fr.length; i++) diffs.push(mad(fr[i - 1], fr[i]));
const mid = diffs.slice(FP24, diffs.length - FP24).slice().sort((a, b) => a - b);
const BASE = mid[Math.floor(mid.length / 2)]; // 中位数=运动基线(避开首尾淡变)
console.log(`全片邻帧差中位基线(24fps) = ${BASE.toFixed(2)}`);
for (const j of joints) {
  const lo = Math.max(0, Math.floor((j.t - 0.45) * FP24)), hi = Math.min(diffs.length - 1, Math.ceil((j.t + 0.45) * FP24));
  let mx = 0, mt = 0;
  for (let i = lo; i <= hi; i++) if (diffs[i] > mx) { mx = diffs[i]; mt = i / FP24; }
  // 硬接点: 切点边界帧对才反映真实跳变(窗口 max 会被片内高运动帧污染)
  let extra = "";
  if (!j.d) {
    const f = Math.min(diffs.length - 1, Math.max(0, Math.round(j.t * FP24) - 1));
    extra = `  边界帧差 ${diffs[f].toFixed(2)}/${diffs[Math.min(diffs.length - 1, f + 1)].toFixed(2)}`;
  }
  const verdict = mx < BASE * 1.6 ? "接近无缝" : mx < BASE * 3 ? "溶解可接受" : "偏硬,注意";
  console.log(`  接点 ${j.t}s ${j.d ? "溶解" : "硬接"}: 窗口最大差 ${mx.toFixed(2)} (=${(mx / BASE).toFixed(2)}x基线, @${mt.toFixed(2)}s)${extra} -> ${verdict}`);
}

// B) 目检图
const cells = `${OUT}/j`;
fs.mkdirSync(cells, { recursive: true });
const rows = [];
joints.forEach((j, k) => {
  const offs = j.d ? [-0.30, -0.15, 0, 0.15, 0.30] : [-0.083, -0.042, 0, 0.042, 0.083];
  const files = offs.map((o, m) => {
    const f = `${cells}/k${k}_${m}.jpg`;
    if (!fs.existsSync(f)) execFileSync(FF, ["-v", "error", "-y", "-ss", Math.max(0, j.t + o).toFixed(3), "-i", CFG.out, "-frames:v", "1", "-vf", "scale=168:224", f]);
    return f;
  });
  const row = `${cells}/row${k}.jpg`;
  if (!rows.includes(row)) rows.push(row);
  if (!fs.existsSync(row)) execFileSync(FF, ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `hstack=${files.length}`, "-frames:v", "1", row]);
});
execFileSync(FF, ["-v", "error", "-y", ...rows.flatMap((r) => ["-i", r]), "-filter_complex", `vstack=${rows.length}`, "-frames:v", "1", `cut/mverify/${TAG}_joins.jpg`]);
execFileSync(FF, ["-v", "error", "-y", "-i", CFG.out, "-vf", `fps=1,scale=120:160,tile=6x${Math.ceil(dur(CFG.out) / 6) + 1}`, "-frames:v", "1", `cut/mverify/${TAG}_overview.jpg`]);
console.log(`目检图 -> cut/mverify/${TAG}_joins.jpg, cut/mverify/${TAG}_overview.jpg`);
