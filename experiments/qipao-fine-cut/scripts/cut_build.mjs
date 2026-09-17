// 步骤 3 · 精剪合成：按「能量递减弧」重排 6 条 take，在姿态匹配帧下刀，舞蹈接点 0.22s 叠化、收尾慢镜接点 0.35s 叠化。
// 在仓库根目录执行：node experiments/qipao-fine-cut/scripts/cut_build.mjs
// 依赖：ffmpeg / ffprobe（FFMPEG / FFPROBE 可覆盖）；中间片段缓存在 _work/qtrim/
// 输出：qipao_fine_cut.mp4（544x960 / 24fps CFR / yuv420p / SAR 1:1 / bt709 / AAC 32kHz）
//
// 三条硬约束：
//  1) 进出点来自步骤 1 的扫描结果，并把匹配帧落在溶解正中——两侧各留一半溶解时长；
//  2) 棚拍纯白背景，补边必须用白色（黑边在白背景里就是脏边）；
//  3) 全部 xfade/acrossfade 与结尾压白放进一次 filter_complex，全片只编码一次。
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const FP = process.env.FFPROBE || "ffprobe";
const DIR = "experiments/qipao-fine-cut";
const TMP = `${DIR}/_work/qtrim`;
const OUT = `${DIR}/qipao_fine_cut.mp4`;

// [take, 进点s, 出点s]，顺序即成片顺序（能量递减弧，两组重复 take 被拆开）
const SEGS = [
  ["00273", 0.0, 4.03],   // 开场: 回眸->举手->转体->正面舞; 尾帧3.92接276@1.50
  ["00276", 1.39, 3.53],  // 转体核心; 尾帧3.42(旋背)接274@2.33(甩发旋)
  ["00274", 2.22, 3.94],  // 甩发->正面舞姿; 尾帧3.83接278@1.67(正面抬手浪)
  ["00278", 1.56, 4.505], // 正面舞最高能段; 尾4.33起收给慢镜
  ["00277", 2.245, 5.17], // 慢摆过渡(动能收掉); 尾5.0与275首段姿态几乎同帧
  ["00275", 0.905, 5.17], // 收: 静态回眸+微风, 结尾压白
];
const XFS = [0.22, 0.22, 0.22, 0.35, 0.35]; // 相邻接点溶解时长
const FADE_OUT = 0.55;                      // 结尾画面与声音同步压白

const ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  "-pix_fmt", "yuv420p", "-x264-params", "keyint=48:min-keyint=48:scenecut=0",
  "-c:a", "aac", "-ar", "32000", "-ac", "2", "-b:a", "160k", "-movflags", "+faststart"];

function dur(f) {
  return Number(execFileSync(FP, ["-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).trim());
}

fs.mkdirSync(TMP, { recursive: true });

// 1) 归一化各段: 等比缩放进 544x960 + 白色补边 + 24fps CFR + 统一时间基
const parts = [];
SEGS.forEach(([s, a, b], i) => {
  const dst = `${TMP}/q${i + 1}.mp4`;
  if (!(fs.existsSync(dst) && fs.statSync(dst).size > 4096)) {
    execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y",
      "-ss", a.toFixed(3), "-t", (b - a).toFixed(3), "-i", `${DIR}/takes/take_${s}.mp4`,
      "-vf", "scale=544:960:force_original_aspect_ratio=decrease:flags=lanczos," +
        "pad=544:960:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps=24,settb=1/24000",
      ...ENC, dst], { stdio: ["ignore", "ignore", "pipe"] });
  }
  parts.push({ f: dst, d: dur(dst), s });
  console.log(`q${i + 1} ${s} [${a}, ${b}] -> ${parts[i].d.toFixed(3)}s`);
});

// 2) 一次 filter_complex: 链式 xfade + acrossfade, 结尾压白
const ins = parts.flatMap((p) => ["-i", p.f]);
let cv = "[0:v]", ca = "[0:a]";
let accD = parts[0].d;
const fg = [];
for (let i = 0; i < parts.length - 1; i++) {
  const xf = XFS[i];
  const off = (accD - xf).toFixed(3);
  fg.push(`${cv}[${i + 1}:v]xfade=transition=fade:duration=${xf}:offset=${off}[xv${i}]`);
  fg.push(`${ca}[${i + 1}:a]acrossfade=d=${xf}:c1=tri:c2=tri[xa${i}]`);
  cv = `[xv${i}]`; ca = `[xa${i}]`;
  accD = accD + parts[i + 1].d - xf;
}
const st = Math.max(0, accD - FADE_OUT).toFixed(3);
fg.push(`${cv}settb=1/24000,fps=24,format=yuv420p,fade=t=out:st=${st}:d=${FADE_OUT}:color=white[vo]`);
fg.push(`${ca}afade=t=out:st=${st}:d=${FADE_OUT}[ao]`);

execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...ins,
  "-filter_complex", fg.join(";"), "-map", "[vo]", "-map", "[ao]", ...ENC, OUT],
  { stdio: ["ignore", "ignore", "pipe"] });

console.log(`\n✅ ${OUT}  ${dur(OUT).toFixed(2)}s  ${(fs.statSync(OUT).size / 1048576).toFixed(2)}MB  (原序直拼 31.0s)`);
