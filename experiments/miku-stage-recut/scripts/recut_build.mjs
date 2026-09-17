// v5 反慢放合成: node cut/build_final.mjs <cel|real>
//   诊断依据 ../strip_*.jpg / ../slowmo_hang_24fps.jpg 抽帧带: 两个跳跃镜头滞空 2.4~3.0s(生理极限~0.7s, 提示词"hangs at the peak"慢放渲染),
//   四个情绪镜头后 2~3.5s 是近静止漂移定格(贴脸/伸手), 成片中段因此拖沓.
//   对策: 分段 setpts/atempo 提速, 变速窗口只落在"滞空"与"定格漂移"上(无运动参照, 观众读作风感/更紧凑),
//   起跳/落地/转头等真动作保持1x; 所有接点(硬接姿态匹配帧/溶解重叠区)都在1x或不变段内, 已验证的接点几何不动.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const FP = process.env.FFPROBE || "ffprobe";
const TAG = process.argv[2];
const durOf = (f) => Number(execFileSync(FP, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
const V = (s) => `videos/${s}_00001_.mp4`;
const FULL = (s) => durOf(V(s));

// parts: [源入, 源出, 倍速] 分段表(源时间坐标, 必须首尾相接)
const CFG = {
  cel: {
    out: "merged/recut_cel.mp4",
    fade: [0.3, 0.55],
    segs: [
      { src: "story2_shot2", parts: [[0, 5.083, 1]] },
      // 起跳@1x, 滞空1.45~3.6压缩2.7x(1.5x坡道进出), 落地尾段回1x保 j2 硬接姿态帧
      { src: "story2_shot3", parts: [[0.08, 1.15, 1], [1.15, 1.45, 1.5], [1.45, 3.6, 2.7], [3.6, 3.9, 1.5], [3.9, 5.083, 1]] },
      // 落地+转头@1x, 回头定格漂移段1.5x
      { src: "story2_shot4", parts: [[0, 2.5, 1], [2.5, 5.0, 1.5]] },
      // 转身+抬手@1x, 伸手定格漂移段1.5x(出点4.25姿态帧不变)
      { src: "story2_shot5", parts: [[0, 2.2, 1], [2.2, 4.25, 1.5]] },
      { src: "story2_shot6", parts: [[0, FULL("story2_shot6"), 1]] }, // 谢幕退场保持原速
      { src: "story_shot1", parts: [[0, FULL("story_shot1"), 1]] },   // 曲终睁眼保持原速
    ],
    xfs: [0.25, 0, 0, 0, 0.5],
  },
  real: {
    out: "merged/recut_real.mp4",
    fade: [0.4, 0.55],
    segs: [
      { src: "story2_shot2fix", parts: [[1.3, 3.0, 1]] },
      { src: "story_shot2", parts: [[0, FULL("story_shot2"), 1]] },
      // 实测离地0.5s/落地3.5s(jump_24fps.jpg): 滞空2.7s窗口压至~1.1s; 落地欢呼定格尾1.35x微收
      { src: "story_shot3", parts: [[0, 0.5, 1], [0.5, 0.8, 1.5], [0.8, 3.2, 2.7], [3.2, 3.6, 1.5], [3.6, FULL("story_shot3"), 1.35]] },
      { src: "story_shot4", parts: [[0, 2.5, 1], [2.5, 5.083, 1.5]] },
      { src: "story_shot5", parts: [[0, 1.6, 1], [1.6, 5.083, 1.5]] },
      { src: "story_shot6", parts: [[0, FULL("story_shot6"), 1]] },
    ],
    xfs: [0.35, 0.35, 0.35, 0, 0],
  },
}[TAG];
if (!CFG) { console.error("用法: node cut/build_final.mjs <cel|real>"); process.exit(1); }

const ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
  "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-x264-params", "keyint=48:min-keyint=48:scenecut=0",
  "-c:a", "aac", "-ar", "32000", "-ac", "2", "-b:a", "160k", "-movflags", "+faststart"];

const ins = [];
const flt = [];
const segsOut = [];
let idx = 0;
for (let si = 0; si < CFG.segs.length; si++) {
  const sg = CFG.segs[si];
  const vl = [], al = [];
  let len = 0;
  for (let pi = 0; pi < sg.parts.length; pi++) {
    const [a, b, k] = sg.parts[pi];
    ins.push("-ss", String(a), "-t", (b - a).toFixed(4), "-i", V(sg.src));
    flt.push(`[${idx}:v]settb=1/24000,setpts=(PTS-STARTPTS)/${k},fps=24,format=yuv420p,setsar=1[q${si}_${pi}];`);
    flt.push(`[${idx}:a]aformat=sample_rates=32000:channel_layouts=stereo,atempo=${k}[r${si}_${pi}];`);
    vl.push(`q${si}_${pi}`); al.push(`r${si}_${pi}`);
    len += (b - a) / k;
    idx++;
  }
  if (vl.length === 1) segsOut.push({ v: vl[0], a: al[0], len });
  else {
    // concat 输出 timebase 变 1/1000000, 再 settb 归一才能进 xfade
    flt.push(vl.map((v, pi) => `[${v}][${al[pi]}]`).join("") + `concat=n=${vl.length}:v=1:a=1[cV${si}c][a${si}];[cV${si}c]settb=1/24000,fps=24[v${si}];`);
    segsOut.push({ v: `v${si}`, a: `a${si}`, len });
  }
}

// 按硬接分 run, 组内 concat, 组间 xfade+acrossfade
const runs = []; let cur = [0];
for (let i = 0; i < CFG.xfs.length; i++) { if (CFG.xfs[i] === 0) cur.push(i + 1); else { runs.push(cur); cur = [i + 1]; } }
runs.push(cur);
const runStream = runs.map((run, ri) => {
  if (run.length === 1) return segsOut[run[0]];
  flt.push(run.map((i) => `[${segsOut[i].v}][${segsOut[i].a}]`).join("") + `concat=n=${run.length}:v=1:a=1[rV${ri}c][rA${ri}];[rV${ri}c]settb=1/24000,fps=24[rV${ri}];`);
  return { v: `rV${ri}`, a: `rA${ri}`, len: run.reduce((s, i) => s + segsOut[i].len, 0) };
});
let acc = runStream[0];
for (let ri = 1; ri < runStream.length; ri++) {
  const d = CFG.xfs[runs[ri - 1][runs[ri - 1].length - 1]];
  const off = (acc.len - d).toFixed(3);
  flt.push(`[${acc.v}][${runStream[ri].v}]xfade=transition=fade:duration=${d}:offset=${off}[X${ri}];[X${ri}]settb=1/24000,fps=24[xv${ri}];`);
  flt.push(`[${acc.a}][${runStream[ri].a}]acrossfade=d=${d}:c1=tri:c2=tri[xa${ri}];`);
  acc = { v: `xv${ri}`, a: `xa${ri}`, len: acc.len + runStream[ri].len - d };
}
const total = acc.len;
const [fi, fo] = CFG.fade;
const st = Math.max(0, total - fo).toFixed(3);
flt.push(`[${acc.v}]fade=t=in:st=0:d=${fi},fade=t=out:st=${st}:d=${fo},format=yuv420p[vo];` +
  `[${acc.a}]afade=t=in:st=0:d=${fi},afade=t=out:st=${st}:d=${fo}[ao]`);
execFileSync(FF, ["-v", "error", "-y", ...ins, "-filter_complex", flt.join(""),
  "-map", "[vo]", "-map", "[ao]", ...ENC, CFG.out], { stdio: ["ignore", "inherit", "inherit"] });
console.log(`-> ${CFG.out}  ${durOf(CFG.out).toFixed(2)}s  ${(fs.statSync(CFG.out).size / 1048566).toFixed(1)}MB  理论${total.toFixed(2)}s`);
