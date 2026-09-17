// 步骤 2 · 切点预检：把计划接点的「上一段尾帧 | 下一段首帧」并排成一列，一张图目检姿态是否对得上。
// 在仓库根目录执行：node experiments/qipao-fine-cut/scripts/cut_joincheck.mjs
// 输出：joins_check.jpg（已随本实验提交）
//
// 为什么还要看图：MAD 找的是像素距离最小的帧，但「像素近」不等于「动作连贯」——
// 甩发中途与定格瞬间可能数值很近却接不上。数值筛完必须目检定刀。
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const FF = process.env.FFMPEG || "ffmpeg";
const DIR = "experiments/qipao-fine-cut";
const OUT = `${DIR}/joins_check.jpg`;

// [A段, A时刻, B段, B时刻]：时刻取步骤 1 的扫描匹配点；末两对接沿用实际保留的头尾
const JOINS = [
  ["00273", 3.92, "00276", 1.5],
  ["00276", 3.42, "00274", 2.33],
  ["00274", 3.83, "00278", 1.67],
  ["00278", 4.9, "00277", 2.25],
  ["00277", 5.0, "00275", 0.9],
];

const inputs = [];
const fg = [];
for (const [a, ta, b, tb] of JOINS) {
  inputs.push("-ss", String(ta), "-i", `${DIR}/takes/take_${a}.mp4`, "-ss", String(tb), "-i", `${DIR}/takes/take_${b}.mp4`);
}
JOINS.forEach((_, k) => {
  const i = k * 2;
  fg.push(`[${i}:v]scale=272:480:flags=lanczos,setsar=1[va${k}];[${i + 1}:v]scale=272:480:flags=lanczos,setsar=1[vb${k}];[va${k}][vb${k}]hstack=2[r${k}];`);
});
fg.push(JOINS.map((_, k) => `[r${k}]`).join("") + `vstack=${JOINS.length}[v]`);

execFileSync(FF, ["-v", "error", "-y", ...inputs, "-filter_complex", fg.join(""), "-map", "[v]", "-frames:v", "1", OUT], { stdio: ["ignore", "ignore", "pipe"] });
console.log("出图", OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + "KB");
