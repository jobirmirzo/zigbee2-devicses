// Zigbee2MQTT device docs (.md) -> normalized JSON
//
// Usage: node parse-devices.mjs [--in ../devices] [--out ./data] [--limit N]
//
// Emits:
//   <out>/devices/<model>.json   one file per device
//   <out>/index.json             slim manifest for search/listing
//   <out>/vocabulary.json        every property seen + how often (drives the component registry)

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(n);
  return i === -1 ? d : args[i + 1];
};

const IN_DIR = path.resolve(flag("--in", "../devices"));
const OUT_DIR = path.resolve(flag("--out", "./data"));
const LIMIT = Number(flag("--limit", 0)) || Infinity;

// ---------------------------------------------------------------- primitives

const GROUPED = new Set(["light", "switch", "cover", "lock", "climate", "fan"]);
const ATOMIC = new Set(["numeric", "enum", "binary", "text", "composite", "list"]);

const bt = (s) => (s ? [...s.matchAll(/`([^`]*)`/g)].map((m) => m[1]) : []);

/** `### Foo (numeric, l1 endpoint)` -> {label, type, endpoint} */
function parseHeading(raw) {
  const m = /^###\s+(.*?)\s*$/.exec(raw);
  if (!m) return null;
  let label = m[1];
  let type = null;
  let endpoint = null;

  const paren = /\s*\(([^()]*)\)$/.exec(label);
  if (paren) {
    const parts = paren[1].split(",").map((s) => s.trim());
    const kept = [];
    for (const p of parts) {
      const ep = /^(.*?)\s+endpoint$/.exec(p);
      if (ep) endpoint = ep[1];
      else if (ATOMIC.has(p.toLowerCase()) || GROUPED.has(p.toLowerCase())) type = p.toLowerCase();
      else kept.push(p);
    }
    // only strip the parenthetical if we actually recognised its contents
    if (type || endpoint) label = label.slice(0, paren.index) + (kept.length ? ` (${kept.join(", ")})` : "");
  }

  label = label.trim();
  const slug = label.toLowerCase();
  if (!type && GROUPED.has(slug)) type = slug;
  return { label, type, endpoint };
}

// Docs sometimes already carry the endpoint in the property name
// (`battery_1` on the `1` endpoint) and sometimes don't (`state` on `l1`).
const withEp = (prop, ep) => {
  if (!ep || !prop) return prop;
  return prop === ep || prop.endsWith(`_${ep}`) ? prop : `${prop}_${ep}`;
};

/** property name with any endpoint suffix removed -> the semantic key */
const baseOf = (prop, ep) => {
  if (!prop) return prop;
  if (ep && prop.endsWith(`_${ep}`)) return prop.slice(0, -(ep.length + 1));
  return prop;
};

// ------------------------------------------------------------ atomic exposes

function parseAtomic(head, body) {
  const text = body.join("\n");
  const line = (re) => body.find((l) => re.test(l)) ?? "";

  // description = leading prose before the machine-readable lines
  const desc = [];
  for (const l of body) {
    if (!l.trim()) continue;
    if (/^(Value (can be found|will)|It's not possible|To (read|write|control|change|set)|Can be set|The (possible|minimal|unit)|If value|- `|#### )/.test(l)) break;
    desc.push(l.trim());
  }

  const propM = /`([A-Za-z0-9_]+)` property/.exec(text) || /payload `\{"([A-Za-z0-9_]+)":/.exec(text);
  const property = withEp(propM?.[1] ?? null, head.endpoint);

  const published = !/Value will \*\*not\*\* be published/.test(text);
  const readable = !/not possible to read \(`\/get`\)/.test(text);
  const writable = /To write \(`\/set`\)|Can be set by publishing/.test(text);

  const node = {
    name: head.label,
    type: head.type,
    property,
    base: baseOf(property, head.endpoint),
    endpoint: head.endpoint ?? null,
    description: desc.join(" ") || null,
    access: { published, readable, writable },
  };

  if (head.type === "numeric") {
    const r = /minimal value is `([-\d.]+)` and the maximum value is `([-\d.]+)`/.exec(text);
    if (r) { node.value_min = Number(r[1]); node.value_max = Number(r[2]); }
    const u = /unit of this value is `([^`]+)`/.exec(text);
    if (u) node.unit = u[1];
    const s = /value step size is `([-\d.]+)`/.exec(text);
    if (s) node.value_step = Number(s[1]);
  }

  if (head.type === "enum") {
    node.values = bt(line(/possible values are/));
  }

  if (head.type === "binary") {
    // "If value equals `ON` x is ON, if `OFF` OFF."  /  "`true` ... `false`"
    const v = bt(line(/^If value equals/));
    node.value_on = v[0] ?? true;
    node.value_off = v[1] ?? false;
    if (node.value_on === "true") node.value_on = true;
    if (node.value_off === "false") node.value_off = false;
  }

  if (head.type === "composite") {
    node.features = body
      .filter((l) => /^-\s+`[a-z0-9_]+`\s*\(/.test(l))
      .map((l) => {
        const m = /^-\s+`([a-z0-9_]+)`\s*\((\w+)\):\s*(.*)$/.exec(l);
        if (!m) return null;
        const f = { property: m[1], type: m[2], description: m[3].trim() || null };
        const av = /allowed values:\s*(.*)$/.exec(m[3]);
        if (av) { f.values = bt(av[1]); f.description = m[3].slice(0, av.index).trim() || null; }
        return f;
      })
      .filter(Boolean);
  }

  return node;
}

// ----------------------------------------------------------- grouped exposes

function parseGrouped(head, body) {
  const text = body.join("\n");
  const node = {
    name: head.label,
    type: head.type,
    endpoint: head.endpoint ?? null,
    features: [],
    capabilities: {},
  };

  // "This light supports the following features: `state`, `brightness`, ..."
  const featLine = body.find((l) => /supports the following features/.test(l));
  let feats = bt(featLine);

  if (!feats.length) {
    // switch / cover / lock / fan describe features inline instead
    const seen = new Set();
    for (const m of text.matchAll(/payload `\{"([a-z0-9_]+)":/g)) seen.add(m[1]);
    if (/position/.test(text)) seen.add("position");
    if (/`tilt`|tilt/.test(text) && head.type === "cover") seen.add("tilt");
    feats = [...seen];
  }

  for (const f of feats) {
    const detail = body.find((l) => new RegExp("^-\\s+`" + f + "`").test(l)) ?? text;
    const feature = { property: withEp(f, head.endpoint), base: baseOf(withEp(f, head.endpoint), head.endpoint) };

    const r = /between `([-\d.]+)` and `([-\d.]+)`/.exec(detail);
    if (r) { feature.value_min = Number(r[1]); feature.value_max = Number(r[2]); }

    if (f === "state" || f === "fan_state") feature.values = ["ON", "OFF", "TOGGLE"];
    if (head.type === "cover" && f === "state") feature.values = ["OPEN", "CLOSE", "STOP"];
    if (head.type === "lock" && f === "state") feature.values = ["LOCK", "UNLOCK"];

    const one = /is one of: (.*?)\./.exec(detail) || /can be: (.*?)\./.exec(detail);
    if (one) feature.values = bt(one[1]);

    const also = /the following values are accepted: (.*?)\./.exec(detail);
    if (also) feature.presets = bt(also[1]);

    const unit = /is the (°C|%|K) between/.exec(detail);
    if (unit) feature.unit = unit[1];

    feature.readable = !/Reading \(`\/get`\) this attribute is not possible/.test(detail);
    node.features.push(feature);
  }

  node.capabilities = {
    transition: /^#### Transition/m.test(text) || /"transition"/.test(text),
    timed_off: /on with timed off/i.test(text),
    move_step: /#### Moving\/stepping/i.test(text),
  };

  // grouped climate features are documented as "- `x`: ..." lines only
  if (head.type === "climate" && !node.features.length) {
    for (const m of text.matchAll(/^-\s+`([a-z0-9_]+)`:/gm)) {
      const p = withEp(m[1], head.endpoint);
      node.features.push({ property: p, base: baseOf(p, head.endpoint) });
    }
  }

  return node;
}

// -------------------------------------------------------------- file -> json

function parseFile(file) {
  const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const model = path.basename(file, ".md");

  const meta = {};
  for (const [, k, v] of src.matchAll(/^\|\s*([A-Za-z ]+?)\s*\|\s*(.*?)\s*\|$/gm)) {
    if (!meta[k]) meta[k] = v;
  }
  const vendorM = /\[([^\]]+)\]/.exec(meta.Vendor ?? "");
  const picM = /\((https?:[^)]+)\)/.exec(meta.Picture ?? "");
  const added = /^addedAt:\s*(.*)$/m.exec(src);

  const device = {
    model: (meta.Model || model).trim(),
    file: path.basename(file),
    vendor: vendorM?.[1] ?? null,
    description: meta.Description ?? null,
    image: picM?.[1] ?? null,
    added_at: added?.[1]?.trim() ?? null,
    exposes_summary: (meta.Exposes ?? "").trim() || null,
    exposes: [],
    warnings: [],
  };

  // isolate the Exposes section
  const lines = src.split("\n");
  const start = lines.findIndex((l) => /^## Exposes\s*$/.test(l));
  if (start === -1) {
    device.warnings.push("no-exposes-section");
    return device;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  const section = lines.slice(start + 1, end);

  // split on ### headings (#### belongs to the parent block)
  const blocks = [];
  let cur = null;
  for (const l of section) {
    if (/^###\s+\S/.test(l) && !/^####/.test(l)) {
      cur = { heading: l, body: [] };
      blocks.push(cur);
    } else if (cur) cur.body.push(l);
  }

  for (const b of blocks) {
    const head = parseHeading(b.heading);
    if (!head) continue;
    if (!head.type) { device.warnings.push(`untyped:${head.label}`); continue; }
    const node = GROUPED.has(head.type) ? parseGrouped(head, b.body) : parseAtomic(head, b.body);
    if (!GROUPED.has(head.type) && !node.property) device.warnings.push(`no-property:${head.label}`);
    device.exposes.push(node);
  }

  return device;
}

// ------------------------------------------------------------------- runner

const files = fs.readdirSync(IN_DIR).filter((f) => f.endsWith(".md")).slice(0, LIMIT);
fs.rmSync(path.join(OUT_DIR, "devices"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, "devices"), { recursive: true });

const index = [];
const vocab = new Map();
const stats = { files: files.length, exposes: 0, warnings: 0, byType: {}, byGrouped: {} };

for (const f of files) {
  const d = parseFile(path.join(IN_DIR, f));
  const safe = d.model.replace(/[^A-Za-z0-9._-]/g, "_");
  fs.writeFileSync(path.join(OUT_DIR, "devices", `${safe}.json`), JSON.stringify(d, null, 2));

  const caps = new Set();
  const walk = (n) => {
    stats.exposes++;
    stats.byType[n.type] = (stats.byType[n.type] ?? 0) + 1;
    if (GROUPED.has(n.type)) {
      stats.byGrouped[n.type] = (stats.byGrouped[n.type] ?? 0) + 1;
      caps.add(n.type);
      for (const ft of n.features) {
        const key = `${n.type}.${ft.base}`;
        vocab.set(key, (vocab.get(key) ?? 0) + 1);
      }
    } else {
      const base = n.base ?? n.name;
      const key = `${base}:${n.type}`;
      vocab.set(key, (vocab.get(key) ?? 0) + 1);
      caps.add(base);
    }
  };
  d.exposes.forEach(walk);
  stats.warnings += d.warnings.length;

  index.push({
    model: d.model, vendor: d.vendor, description: d.description,
    image: d.image, file: `${safe}.json`,
    capabilities: [...caps].sort(), exposeCount: d.exposes.length,
    warnings: d.warnings.length,
  });
}

fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
fs.writeFileSync(
  path.join(OUT_DIR, "vocabulary.json"),
  JSON.stringify(
    [...vocab.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count })),
    null, 2
  )
);
fs.writeFileSync(path.join(OUT_DIR, "stats.json"), JSON.stringify(stats, null, 2));

console.log(JSON.stringify(stats, null, 2));
console.log(`\nwrote ${index.length} device json files -> ${OUT_DIR}`);
