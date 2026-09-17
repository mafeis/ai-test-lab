// 步骤 4 · 成片验收：同一套帧差指标回头量成片，并出连拍图供人眼复核。
// 在仓库根目录执行：node experiments/qipao-fine-cut/scripts/cut_verify.mjs
// 输出：控制台指标 + overview_frames.jpg(2fps 连拍) + preview.gif(8fps 动效)
//
// 判据：接点处「窗口内最大相邻帧差 / 全片运动基线」。
//   <1.0x 近乎不可见 · 1.0~1.6x 顺 · 1.6~2.2x 叠化可接受 · >2.2x 偏跳。
// 上限不是 1.0x：舞蹈大幅运镜 + 纯白背景（无轮廓参照）下，6 条 take 的像素最近对也只到 1.64x 基线，
// 所以「接点必须低于基线」对这类素材不可达，剩下的残差交给 0.22s 溶解摊平。
// 对照物是 qipao_raw_concat.mp4（原序直拼，每段整段保留、接点硬切）。
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const DIR = "experiments/qipao-fine-cut";
const NEW = `${DIR}/qipao_fine_cut.mp4`;
const OLD = `${DIR}/qipao_raw_concat.mp4`;
const OUT = `${DIR}/_work/verify`;
const FPS = 12, W = 40, H = 52;

// 接点窗口（由 cut_build 的实际保留时长推得）
const JOINS = [
  ["00273->00276", 3.822, 4.042],
  ["00276->00274", 5.769, 5.989],
  ["00274->00278", 7.299, 7.519],
  ["00278->00277", 9.907, 10.257],
  ["00277->00275", 12.474, 12.824],
];

fs.mkdirSync(OUT, { recursive: true });
/** 解码成 12fps 灰度小帧（已解码则复用缓存） */
function decode(src, tag) {
  const dir = `${OUT}/${tag}`;
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(`${dir}/f0000.raw`)) {
    execFileSync(FF, ["-v", "error", "-y", "-i", src, "-vf", `fps=${FPS},scale=${W}:${H}`, "-pix_fmt", "gray", `${dir}/f%04d.raw`]);
  }
  return fs.readdirSync(dir).filter((f) => f.endsWith(".raw")).sort().map((f) => fs.readFileSync(`${dir}/${f}`));
}
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
function diffSeries(src, tag) {
  const fr = decode(src, tag);
  const d = [];
  for (let i = 1; i < fr.length; i++) d.push({ t: i / FPS, v: mad(fr[i - 1], fr[i]) });
  return { n: fr.length, d, base: d.reduce((s, x) => s + x.v, 0) / d.length };
}

const a = diffSeries(NEW, "new");
console.log(`精剪成片 ${a.n}帧 / ${(a.n / FPS).toFixed(2)}s, 运动基线 = ${a.base.toFixed(2)}`);
console.log("\n接点质量 (窗口内最大相邻帧差, 越接近基线越顺):");
for (const [name, t0, t1] of JOINS) {
  const win = a.d.filter((x) => x.t >= t0 - 0.2 && x.t <= t1 + 0.2);
  const mx = Math.max(...win.map((x) => x.v));
  const r = mx / a.base;
  const verdict = r < 1.0 ? "近乎不可见" : r < 1.6 ? "顺" : r < 2.2 ? "叠化可接受" : "偏跳";
  console.log(`  ${name}  最大=${mx.toFixed(2)}  (${r.toFixed(2)}x基线) ${verdict}`);
}

const b = diffSeries(OLD, "old");
const durOld = b.n / FPS;
console.log(`\n[对照] 原序直拼基线 = ${b.base.toFixed(2)}, 硬跳处最大帧差:`);
for (let k = 1; k <= 5; k++) {
  const tc = (k / 6) * durOld;
  const win = b.d.filter((x) => x.t >= tc - 0.2 && x.t <= tc + 0.2).map((x) => x.v);
  if (win.length) console.log(`  第${k}接点 ~${tc.toFixed(2)}s  最大=${Math.max(...win).toFixed(2)} (${(Math.max(...win) / b.base).toFixed(2)}x基线)`);
}

// 人眼复核素材：连拍图看节奏与姿态, GIF 看动效
execFileSync(FF, ["-v", "error", "-y", "-i", NEW, "-vf", "fps=2,scale=168:298:flags=lanczos,tile=6x6", "-frames:v", "1", `${DIR}/overview_frames.jpg`], { stdio: ["ignore", "ignore", "pipe"] });
execFileSync(FF, ["-v", "error", "-y", "-i", NEW, "-vf", "fps=8,scale=272:480:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a", "-loop", "0", `${OUT}/preview.gif`], { stdio: ["ignore", "ignore", "pipe"] });
console.log(`\n出图 ${DIR}/overview_frames.jpg, ${OUT}/preview.gif`);
