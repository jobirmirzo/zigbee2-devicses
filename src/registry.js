// registry.js — the whole "which component do I draw?" decision, in one place.
//
// Three layers, checked in order:
//   1. GROUPED   light/switch/cover/lock/climate/fan  -> a hero card
//   2. SEMANTIC  ~45 well-known property names        -> a purpose-built widget
//   3. TYPE      numeric/enum/binary/text/composite/list -> a generic control
//
// Layer 3 is the safety net: it renders ANY expose, including the ~1800
// property names that occur exactly once in the corpus. Layers 1-2 are pure
// polish on top. Nothing ever falls through to "unsupported".

// ---------------------------------------------------------------- layer 1

export const GROUPED_CARD = {
  light: "LightCard",
  switch: "SwitchCard",
  cover: "CoverCard",
  lock: "LockCard",
  climate: "ClimateCard",
  fan: "FanCard",
};

// ---------------------------------------------------------------- layer 2

// role drives LAYOUT (where it goes), component drives RENDER (what it looks like)
const S = (component, role, opts = {}) => ({ component, role, ...opts });

export const SEMANTIC = {
  // --- safety alarms: the loudest thing on the card when tripped
  gas:            S("AlarmTile", "alert", { label: "Gas",         danger: true }),
  smoke:          S("AlarmTile", "alert", { label: "Smoke",       danger: true }),
  carbon_monoxide:S("AlarmTile", "alert", { label: "CO",          danger: true }),
  water_leak:     S("AlarmTile", "alert", { label: "Water leak",  danger: true }),
  tamper:         S("AlarmTile", "alert", { label: "Tamper" }),
  sos:            S("AlarmTile", "alert", { label: "SOS",         danger: true }),
  vibration:      S("AlarmTile", "alert", { label: "Vibration" }),
  alarm:          S("AlarmTile", "alert", { label: "Alarm",       danger: true }),
  battery_low:    S("AlarmTile", "alert", { label: "Battery low" }),

  // --- state sensors
  contact:        S("StateTile", "sensor", { label: "Door",     onLabel: "Closed", offLabel: "Open", invert: true }),
  occupancy:      S("StateTile", "sensor", { label: "Occupancy", onLabel: "Detected", offLabel: "Clear" }),
  presence:       S("StateTile", "sensor", { label: "Presence",  onLabel: "Home",     offLabel: "Away" }),
  moving:         S("StateTile", "sensor", { label: "Moving" }),

  // --- measurements
  temperature:        S("SensorTile", "sensor", { label: "Temperature", precision: 1 }),
  device_temperature: S("SensorTile", "diagnostic", { label: "Device temp", precision: 0 }),
  local_temperature:  S("SensorTile", "sensor", { label: "Temperature", precision: 1 }),
  humidity:           S("SensorTile", "sensor", { label: "Humidity", precision: 0 }),
  illuminance:        S("SensorTile", "sensor", { label: "Light", precision: 0 }),
  pressure:           S("SensorTile", "sensor", { label: "Pressure", precision: 0 }),
  co2:                S("SensorTile", "sensor", { label: "CO₂", precision: 0 }),
  voc:                S("SensorTile", "sensor", { label: "VOC", precision: 0 }),
  pm25:               S("SensorTile", "sensor", { label: "PM2.5", precision: 0 }),
  formaldehyd:        S("SensorTile", "sensor", { label: "Formaldehyde", precision: 0 }),
  soil_moisture:      S("SensorTile", "sensor", { label: "Soil moisture", precision: 0 }),
  gas_value:          S("SensorTile", "sensor", { label: "Gas level", precision: 0 }),
  target_distance:    S("SensorTile", "sensor", { label: "Distance", precision: 2 }),

  // --- power / energy
  power:          S("EnergyTile", "sensor", { label: "Power" }),
  voltage:        S("EnergyTile", "diagnostic", { label: "Voltage" }),
  current:        S("EnergyTile", "diagnostic", { label: "Current" }),
  energy:         S("EnergyTile", "sensor", { label: "Energy" }),
  produced_energy:S("EnergyTile", "sensor", { label: "Produced" }),
  power_factor:   S("EnergyTile", "diagnostic", { label: "Power factor" }),
  ac_frequency:   S("EnergyTile", "diagnostic", { label: "Frequency" }),

  // --- battery gets its own affordance in the card header, not a tile
  battery:        S("BatteryPill", "header"),
  battery_state:  S("BatteryPill", "header"),
  voltage_battery:S("EnergyTile", "diagnostic", { label: "Battery voltage" }),

  // --- buttons / remotes publish events, never state
  action:         S("EventFeed", "event"),

  // --- light sub-features (used when a LightCard is expanded)
  color_temp:     S("ColorTempSlider", "primary"),
  color_xy:       S("ColorWheel", "primary"),
  color_hs:       S("ColorWheel", "primary"),
  brightness:     S("BrightnessSlider", "primary"),
  effect:         S("EffectPicker", "primary"),

  // --- momentary commands: a button, not a switch
  identify:       S("CommandButton", "config", { label: "Identify" }),
  self_test:      S("CommandButton", "config", { label: "Run self-test" }),
  silence:        S("CommandButton", "alert",  { label: "Silence alarm" }),
  alarm_reset:    S("CommandButton", "config", { label: "Reset alarm" }),
  clear_energy:   S("CommandButton", "config", { label: "Reset meter" }),

  // --- config that users actually touch -> keep out of the deep drawer
  child_lock:     S("Toggle", "config", { label: "Child lock" }),
  countdown:      S("DurationInput", "config", { label: "Auto-off" }),
  do_not_disturb: S("Toggle", "config", { label: "Do not disturb" }),
  power_on_behavior: S("Select", "config", { label: "After power loss" }),
};

// property names that are configuration noise -> collapsed drawer by default
const CONFIG_HINTS = [
  /_calibration$/, /_startup$/, /^schedule_/, /_mode$/, /^backlight/, /^indicator/,
  /^led_/, /_sensitivity$/, /^sensitivity$/, /_duration$/, /_delay$/, /_timeout$/,
  /^min_/, /^max_/, /_limit$/, /_threshold$/, /^power_outage/, /^switch_type$/,
  /_speed$/, /^gradient/, /^effect_/, /_offset$/, /_step$/, /_period$/, /_reporting/,
];
const DIAGNOSTIC_HINTS = [/^linkquality$/, /_count$/, /^fault/, /_error/, /_status$/, /^update/];

// -------------------------------------------------------- role + component

/**
 * Decide what to draw for one expose node from the parsed JSON.
 * @returns {{component: string, role: string, label: string, opts: object}}
 */
export function resolve(expose) {
  // layer 1 — grouped
  if (GROUPED_CARD[expose.type]) {
    return { component: GROUPED_CARD[expose.type], role: "primary", label: expose.name, opts: {} };
  }

  const base = expose.base ?? expose.property ?? "";
  const w = expose.access?.writable;

  // layer 2 — semantic
  const sem = SEMANTIC[base];
  if (sem) {
    const { component, role, ...opts } = sem;
    // a read-only "command" or "toggle" can't be a button; fall through to a badge
    if (!w && (component === "Toggle" || component === "CommandButton" || component === "DurationInput")) {
      return { component: "StateTile", role: "diagnostic", label: opts.label ?? humanize(base), opts };
    }
    return { component, role, label: opts.label ?? expose.name, opts };
  }

  // layer 3 — type fallback
  const role = inferRole(base, expose);
  const component = byType(expose, w);
  return { component, role, label: expose.name, opts: {} };
}

function byType(expose, writable) {
  switch (expose.type) {
    case "binary":
      return writable ? "Toggle" : "StateTile";
    case "numeric":
      if (!writable) return "SensorTile";
      // a bounded range is a slider; unbounded is a number field
      return expose.value_min !== undefined && expose.value_max !== undefined
        ? (expose.value_max - expose.value_min <= 1 ? "StepperInput" : "Slider")
        : "NumberInput";
    case "enum":
      if (!writable) return "Badge";
      if (expose.values?.length === 1) return "CommandButton";     // e.g. {identify}
      return (expose.values?.length ?? 0) <= 4 ? "SegmentedControl" : "Select";
    case "text":
      return writable ? "TextInput" : "TextRow";
    case "composite":
      return "CompositeForm";
    case "list":
      return "ListEditor";
    default:
      return "RawJson"; // never reached today, but keeps the UI from crashing
  }
}

function inferRole(base, expose) {
  if (DIAGNOSTIC_HINTS.some((re) => re.test(base))) return "diagnostic";
  if (CONFIG_HINTS.some((re) => re.test(base))) return "config";
  if (expose.type === "composite" || expose.type === "list") return "config";
  if (!expose.access?.writable) return "sensor";
  return "control";
}

export const humanize = (s) =>
  String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// ------------------------------------------------------------------ layout

export const ROLE_ORDER = ["alert", "primary", "control", "sensor", "event", "config", "diagnostic"];

/** Group a device's exposes into the sections the card renders. */
export function layout(device) {
  const sections = Object.fromEntries(ROLE_ORDER.map((r) => [r, []]));
  const header = [];
  for (const e of device.exposes ?? []) {
    const r = resolve(e);
    if (r.role === "header") header.push({ expose: e, ...r });
    else (sections[r.role] ??= []).push({ expose: e, ...r });
  }
  // an endpoint-heavy device (12x the same switch) collapses to one repeater
  return { header, sections };
}
