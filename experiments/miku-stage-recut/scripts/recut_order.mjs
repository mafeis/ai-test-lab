// 顺序穷举：读取 miku_seq.mjs 产出的 pairs.json，对全部排列算「感知成本」并排序。
// 用法: node recut_order.mjs <pairs.json> <顺序 逗号分隔> [对照顺序 逗号分隔]
// 感知成本模型：接点差 v <= 1.6x 运动基线 -> 硬切可全额承担，按 v 全额计；
//              超出部分将被叠化溶解摊薄，只按残差的 25% 计入感知成本。
import fs from "node:fs";

const FILE = process.argv[2];
const ORDER = (process.argv[3] || "").split(",").filter(Boolean);
const ALT = (process.argv[4] || "").split(",").filter(Boolean);
const { BASE, pairs } = JSON.parse(fs.readFileSync(FILE, "utf8"));
const TH = 1.6 * BASE;
const cost = (v) => (v <= TH ? v : TH + (v - TH) * 0.25);

const M = {};
for (const p of pairs) M[`${p.a}>${p.b}`] = p;

function chainCost(order) {
  let c = 0;
  for (let i = 0; i + 1 < order.length; i++) c += cost(M[`${order[i]}>${order[i + 1]}`].d);
  return c;
}

const nodes = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
const perms = [];
(function walk(prefix, rest) {
  if (!rest.length) return perms.push([...prefix]);
  for (let i = 0; i < rest.length; i++) {
    prefix.push(rest[i]);
    walk(prefix, rest.slice(0, i).concat(rest.slice(i + 1)));
    prefix.pop();
  }
})([], nodes);

const scored = perms.map((o) => ({ o, c: chainCost(o) })).sort((x, y) => x.c - y.c);
const short = (s) => s.replace("story2_", "s2:").replace("story_", "s1:");
console.log(`[${FILE}] 基线 ${BASE.toFixed(2)} · 硬切阈值 1.6x=${TH.toFixed(2)} · 全排列 ${perms.length} 条`);
console.log("穷举 Top5:");
for (const { o, c } of scored.slice(0, 5)) console.log(`  ${c.toFixed(1).padStart(6)}  ${o.map(short).join(" -> ")}`);
const rank = (ord) => scored.findIndex((x) => x.o.join() === ord.join()) + 1;
if (ORDER.length) console.log(`选定顺序  ${chainCost(ORDER).toFixed(1)}  排名 ${rank(ORDER)}/${perms.length}  ${ORDER.map(short).join(" -> ")}`);
if (ALT.length) console.log(`对照顺序  ${chainCost(ALT).toFixed(1)}  排名 ${rank(ALT)}/${perms.length}  ${ALT.map(short).join(" -> ")}`);
