

import { useState } from "react";
import { WIDGETS } from "../components/widgets.jsx";

// key must match a name in WIDGETS. `sample` supplies whatever that
// component reads off its props: expose / label / opts / initial value.
const GALLERY = [
  { key: "Toggle", group: "Primitives", sample: { label: "Power", initial: true } },
  {
    key: "Slider",
    group: "Primitives",
    sample: { expose: { value_min: 0, value_max: 100, unit: "%" }, label: "Brightness", initial: 64 },
  },
  {
    key: "StepperInput",
    group: "Primitives",
    sample: { expose: { value_step: 0.5, unit: "°C" }, label: "Target temp", initial: 21.5 },
  },
  {
    key: "NumberInput",
    group: "Primitives",
    sample: { expose: { unit: "W" }, label: "Power limit", initial: 1200 },
  },
  {
    key: "Select",
    group: "Primitives",
    sample: { expose: { values: ["off", "on", "toggle", "previous"] }, label: "Power-on behavior", initial: "previous" },
  },
  {
    key: "SegmentedControl",
    group: "Primitives",
    sample: { expose: { values: ["heat", "auto", "off"] }, label: "Mode", initial: "heat" },
  },
  {
    key: "CommandButton",
    group: "Primitives",
    sample: { expose: { values: ["identify"] }, label: "Identify", initial: null },
  },
  { key: "TextInput", group: "Primitives", sample: { label: "Trigger time", initial: "14:30" } },
  { key: "TextRow", group: "Primitives", sample: { label: "Firmware", initial: "1.2.3" } },
  { key: "Badge", group: "Primitives", sample: { label: "Door state", initial: "closed" } },
  { key: "DurationInput", group: "Primitives", sample: { label: "Auto-off", initial: 30 } },
  {
    key: "CompositeForm",
    group: "Compound",
    sample: {
      expose: {
        name: "Pin code",
        property: "pin_code",
        features: [
          { property: "user", type: "numeric", description: "User ID" },
          { property: "user_type", type: "enum", values: ["unrestricted", "master", "non_access"] },
          { property: "pin_code", type: "numeric", description: "Pincode to set" },
        ],
      },
      initial: null,
    },
  },
  {
    key: "ListEditor",
    group: "Compound",
    sample: {
      expose: { name: "Gradient", property: "gradient", features: [{}, {}, {}] },
      initial: null,
    },
  },
  {
    key: "RawJson",
    group: "Compound",
    sample: { expose: { property: "example", value_min: 0, value_max: 10, nested: { a: 1 } }, initial: null },
  },
  {
    key: "SensorTile",
    group: "Tiles",
    sample: { expose: { unit: "°C" }, label: "Temperature", initial: 21.4 },
  },
  {
    key: "StateTile",
    group: "Tiles",
    sample: { label: "Door", opts: { onLabel: "Closed", offLabel: "Open", invert: true }, initial: true },
  },
  {
    key: "AlarmTile",
    group: "Tiles",
    sample: { label: "Smoke", opts: { danger: true }, initial: false },
  },
  {
    key: "EnergyTile",
    group: "Tiles",
    sample: { expose: { unit: "W" }, label: "Power", initial: 42 },
  },
  { key: "BatteryPill", group: "Tiles", sample: { initial: 76 } },
  {
    key: "EventFeed",
    group: "Tiles",
    sample: { expose: { values: ["single", "double", "hold", "release"] }, initial: null },
  },
  {
    key: "BrightnessSlider",
    group: "Light",
    sample: { expose: { value_min: 0, value_max: 254 }, initial: 180 },
  },
  {
    key: "ColorTempSlider",
    group: "Light",
    sample: { expose: { value_min: 153, value_max: 500 }, initial: 320 },
  },
  { key: "ColorWheel", group: "Light", sample: { label: "Color", initial: 200 } },
  {
    key: "EffectPicker",
    group: "Light",
    sample: { expose: { values: ["blink", "breathe", "colorloop"] }, initial: "colorloop" },
  },
  {
    key: "LightCard",
    group: "Hero cards",
    sample: {
      expose: {
        endpoint: null,
        features: [
          { property: "state", base: "state", values: ["ON", "OFF"] },
          { property: "brightness", base: "brightness", value_min: 0, value_max: 254 },
          { property: "color_temp", base: "color_temp", value_min: 153, value_max: 500 },
        ],
      },
      initial: null,
    },
  },
  {
    key: "SwitchCard",
    group: "Hero cards",
    sample: { expose: { endpoint: null, features: [{ property: "state", base: "state", values: ["ON", "OFF"] }] }, initial: null },
  },
  {
    key: "CoverCard",
    group: "Hero cards",
    sample: {
      expose: {
        endpoint: null,
        features: [
          { property: "position", base: "position", value_min: 0, value_max: 100 },
          { property: "tilt", base: "tilt", value_min: 0, value_max: 100 },
        ],
      },
      initial: null,
    },
  },
  { key: "LockCard", group: "Hero cards", sample: { expose: { endpoint: null }, initial: null } },
  {
    key: "ClimateCard",
    group: "Hero cards",
    sample: {
      expose: {
        endpoint: null,
        features: [
          { property: "local_temperature", base: "local_temperature" },
          { property: "occupied_heating_setpoint", base: "occupied_heating_setpoint", value_min: 5, value_max: 35, unit: "°C" },
          { property: "system_mode", base: "system_mode", values: ["off", "heat", "auto"] },
          { property: "running_state", base: "running_state" },
        ],
      },
      initial: null,
    },
  },
  {
    key: "FanCard",
    group: "Hero cards",
    sample: {
      expose: {
        endpoint: null,
        features: [
          { property: "state", base: "state", values: ["ON", "OFF"] },
          { property: "fan_mode", base: "fan_mode", values: ["low", "medium", "high"] },
        ],
      },
      initial: null,
    },
  },
];

function GalleryTile({ item }) {
  const Comp = WIDGETS[item.key];
  const [value, setValue] = useState(item.sample.initial ?? null);
  if (!Comp) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-slate-400">{item.key}</span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">{item.group}</span>
      </div>
      <div className="rounded-lg bg-slate-950/60 p-3">
        <Comp
          expose={item.sample.expose ?? {}}
          label={item.sample.label ?? ""}
          opts={item.sample.opts ?? {}}
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  );
}

export default function WidgetGallery() {
  const groups = [...new Set(GALLERY.map((g) => g.group))];
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Widget Gallery</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every component in <code className="font-mono text-slate-300">src/components/widgets.jsx</code>, rendered
          once with sample data. All {GALLERY.length} tiles are live — click, drag, type. Every widget is styled
          entirely with Tailwind utility classes.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group} className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{group}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {GALLERY.filter((g) => g.group === group).map((item) => (
              <GalleryTile key={item.key} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
