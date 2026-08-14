// Assign every device ONE primary category (what card does it get?)
//
// Usage: node classify-devices.mjs [--data ./data]
//
// Reads  <data>/devices/*.json
// Writes <data>/categories.json          taxonomy + counts + example models
// Updates <data>/index.json              adds { category, subcategory } per device
//
// The category answers "what IS this device" for the gallery / card chrome.
// Which widgets appear inside the card stays the job of src/registry.js.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(n);
  return i === -1 ? d : args[i + 1];
};
const DATA = path.resolve(flag("--data", "./data"));

// ---------------------------------------------------------------- taxonomy

export const CATEGORIES = {
  light:       { label: "Lights",            icon: "lightbulb" },
  switch:      { label: "Switches & Plugs",  icon: "toggle" },
  cover:       { label: "Covers & Blinds",   icon: "blinds" },
  lock:        { label: "Locks",             icon: "lock" },
  climate:     { label: "Thermostats",       icon: "thermostat" },
  fan:         { label: "Fans",              icon: "fan" },
  safety:      { label: "Safety & Alarms",   icon: "shield" },
  motion:      { label: "Motion & Presence", icon: "motion" },
  contact:     { label: "Door & Window",     icon: "door" },
  air_quality: { label: "Air Quality",       icon: "air" },
  env_sensor:  { label: "Climate Sensors",   icon: "gauge" },
  energy:      { label: "Energy Meters",     icon: "bolt" },
  remote:      { label: "Buttons & Remotes", icon: "remote" },
  other:       { label: "Other",             icon: "device" },
  alias:       { label: "(redirect stubs)",  icon: "device" },
};

const has = (set, ...names) => names.some((n) => set.has(n));
const anyMatch = (set, re) => [...set].some((p) => re.test(p));

/**
 * @param device parsed device JSON
 * @returns {{category: string, subcategory: string|null}}
 */
export function classify(device) {
  const exposes = device.exposes ?? [];
  const types = new Set(exposes.map((e) => e.type));
  const props = new Set(
    exposes.map((e) => e.base ?? e.property).filter(Boolean)
  );
  const desc = `${device.description ?? ""} ${device.model ?? ""}`.toLowerCase();

  // -- doc-page redirects (`redirectTo:` stubs) are not devices at all
  if (exposes.length === 0 && !device.vendor) return { category: "alias", subcategory: null };

  // -- actuators win over everything: a plug that also measures temperature
  //    is still a plug. Order encodes precedence.
  if (types.has("light"))
    return { category: "light", subcategory: lightSub(exposes, desc) };
  if (types.has("cover"))
    return { category: "cover", subcategory: /curtain/.test(desc) ? "curtain" : /blind|shade|shutter/.test(desc) ? "blind" : null };
  if (types.has("lock")) return { category: "lock", subcategory: null };
  if (types.has("climate"))
    return { category: "climate", subcategory: /radiator|trv|valve/.test(desc) ? "trv" : "thermostat" };
  if (types.has("fan")) return { category: "fan", subcategory: null };
  if (types.has("switch")) {
    const metering = has(props, "power", "energy");
    if (/plug|socket|outlet/.test(desc)) return { category: "switch", subcategory: "plug" };
    if (/relay|module|in-wall|din/.test(desc)) return { category: "switch", subcategory: "relay" };
    if (/valve|irrigation|water/.test(desc)) return { category: "switch", subcategory: "valve" };
    return { category: "switch", subcategory: metering ? "plug" : "wall_switch" };
  }

  // -- sirens: writable warning/alarm but no switch expose
  if (has(props, "warning", "squawk") || /siren/.test(desc))
    return { category: "safety", subcategory: "siren" };

  // -- pure sensors, most specific first (Tuya clones use suffixed props
  //    like water_leak_alarm_1, so match by prefix, not exact name)
  if (has(props, "smoke")) return { category: "safety", subcategory: "smoke" };
  if (has(props, "gas")) return { category: "safety", subcategory: "gas" };
  if (has(props, "carbon_monoxide")) return { category: "safety", subcategory: "co" };
  if (anyMatch(props, /^water_leak/)) return { category: "safety", subcategory: "water_leak" };
  if (has(props, "sos")) return { category: "safety", subcategory: "sos" };

  if (anyMatch(props, /^occupancy/) || has(props, "presence"))
    return { category: "motion", subcategory: has(props, "presence", "target_distance") ? "presence" : "pir" };
  if (has(props, "vibration") || (/vibration/.test(desc) && has(props, "x_axis")))
    return { category: "motion", subcategory: "vibration" };
  if (anyMatch(props, /^contact/)) return { category: "contact", subcategory: null };
  if (/opening sensor|door sensor|window sensor/.test(desc) && anyMatch(props, /^alarm/))
    return { category: "contact", subcategory: null };

  if (has(props, "co2", "voc", "pm25", "pm10", "formaldehyd", "aqi"))
    return { category: "air_quality", subcategory: null };
  if (has(props, "soil_moisture")) return { category: "env_sensor", subcategory: "plant" };
  if (anyMatch(props, /^liquid_/)) return { category: "env_sensor", subcategory: "water_level" };
  if (has(props, "temperature", "humidity", "pressure", "illuminance"))
    return { category: "env_sensor", subcategory: null };

  // -- remotes publish `action` events; they may also carry battery/voltage
  if (has(props, "action"))
    return { category: "remote", subcategory: /scene|knob|rotary|dial/.test(desc) ? "dial" : "button" };
  if (anyMatch(props, /ir_code/)) return { category: "remote", subcategory: "ir_blaster" };
  if (/\bremote\b|keypad|wireless (switch|button)|scene switch/.test(desc))
    return { category: "remote", subcategory: "button" };

  if (has(props, "power", "energy", "current", "voltage") && has(props, "energy", "power"))
    return { category: "energy", subcategory: null };

  // -- TRVs whose docs never emit a grouped climate expose
  if (has(props, "pi_heating_demand", "calibrate_valve") && /valve|thermostat|radiator/.test(desc))
    return { category: "climate", subcategory: "trv" };

  // -- last-resort description matches for devices with vendor-specific props
  if (/smoke/.test(desc) && anyMatch(props, /^alarm/)) return { category: "safety", subcategory: "smoke" };
  if (/\balarm\b/.test(desc) && anyMatch(props, /^alarm/)) return { category: "safety", subcategory: "siren" };
  if (/garage door/.test(desc)) return { category: "cover", subcategory: "garage" };
  if (/water valve|irrigation|watering|gas valve/.test(desc)) return { category: "switch", subcategory: "valve" };

  // -- pure network gear: nothing to control, just mesh plumbing
  if (/router|repeater|extender|dongle|bridge|coordinator/.test(desc))
    return { category: "other", subcategory: "repeater" };

  return { category: "other", subcategory: null };
}

function lightSub(exposes, desc) {
  const feats = new Set(
    exposes
      .filter((e) => e.type === "light")
      .flatMap((e) => (e.features ?? []).map((f) => f.base ?? f.property))
  );
  if (/strip|string|gradient/.test(desc)) return "strip";
  if (feats.has("color_xy") || feats.has("color_hs")) return "color";
  if (feats.has("color_temp")) return "color_temp";
  if (feats.has("brightness")) return "dimmable";
  return "on_off";
}

// ---------------------------------------------------------------- run

import { pathToFileURL } from "node:url";
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const devDir = path.join(DATA, "devices");
  const indexPath = path.join(DATA, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const byFile = new Map(index.map((d) => [d.file, d]));

  const counts = {};
  for (const cat of Object.keys(CATEGORIES)) counts[cat] = { total: 0, sub: {}, examples: [] };

  for (const file of fs.readdirSync(devDir)) {
    if (!file.endsWith(".json")) continue;
    const device = JSON.parse(fs.readFileSync(path.join(devDir, file), "utf8"));
    const { category, subcategory } = classify(device);

    const entry = byFile.get(file);
    if (entry) {
      entry.category = category;
      entry.subcategory = subcategory;
    }

    const c = counts[category];
    c.total++;
    if (subcategory) c.sub[subcategory] = (c.sub[subcategory] ?? 0) + 1;
    if (c.examples.length < 5)
      c.examples.push(`${device.vendor} ${device.model} — ${device.description}`);
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  fs.writeFileSync(
    path.join(DATA, "categories.json"),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(CATEGORIES).map(([k, v]) => [k, { ...v, ...counts[k] }])
      ),
      null,
      2
    )
  );

  const summary = Object.entries(counts)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, v]) => `${k.padEnd(12)} ${String(v.total).padStart(5)}  ${Object.entries(v.sub).map(([s, n]) => `${s}:${n}`).join(" ")}`)
    .join("\n");
  console.log(summary);
  console.log(`\n${index.length} devices classified -> index.json updated, categories.json written`);
}
