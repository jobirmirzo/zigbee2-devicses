// Stratified audit: pick N devices covering as many distinct capabilities as
// possible, print what the UI layer would actually get.
import fs from "node:fs";
const idx = JSON.parse(fs.readFileSync("data/index.json", "utf8"));
const N = Number(process.argv[2] || 80);

// greedy set-cover so the sample spans device classes instead of clustering
const pool = idx.filter((d) => d.exposeCount > 0);
const covered = new Set();
const pick = [];
const score = (d) => d.capabilities.filter((c) => !covered.has(c)).length;
while (pick.length < N && pool.length) {
  pool.sort((a, b) => score(b) - score(a) || b.exposeCount - a.exposeCount);
  const d = pool.shift();
  if (!d) break;
  d.capabilities.forEach((c) => covered.add(c));
  pick.push(d);
}

const t = { numeric: "num", enum: "enum", binary: "bool", text: "txt", composite: "comp", list: "list" };
let rows = 0;
for (const e of pick) {
  const d = JSON.parse(fs.readFileSync("data/devices/" + e.file, "utf8"));
  const parts = d.exposes.map((x) => {
    if (x.features) {
      return `${x.type.toUpperCase()}{${x.features.map((f) => f.base).join(",")}}`;
    }
    let s = `${x.property}:${t[x.type] ?? x.type}`;
    if (x.value_min !== undefined) s += `[${x.value_min}..${x.value_max}${x.unit ? " " + x.unit : ""}]`;
    else if (x.unit) s += `[${x.unit}]`;
    if (x.values?.length) s += `{${x.values.slice(0, 4).join("|")}${x.values.length > 4 ? ",+" + (x.values.length - 4) : ""}}`;
    s += x.access.writable ? " RW" : " R";
    return s;
  });
  rows += d.exposes.length;
  console.log(`\n## ${d.vendor} ${d.model} — ${d.description}`);
  parts.slice(0, 10).forEach((p) => console.log(`   · ${p}`));
  if (parts.length > 10) console.log(`   … +${parts.length - 10} more`);
}
console.log(`\n\n=== ${pick.length} devices, ${rows} exposes, ${covered.size} distinct capability keys covered ===`);
