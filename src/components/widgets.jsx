// One React component per registry name. Every widget takes:
//   { expose, label, opts, value, onChange }
// Grouped cards (LightCard, ClimateCard, ...) manage their features internally.

import { useState } from "react";
import { demoFeature } from "../demo.js";
import { humanize } from "../registry.js";
import { PowerIcon, FanIcon } from "../icons";
const unit = (e) => e.unit ?? "";

// row/card visuals shared across widgets. `bare` is used when a widget is
// nested inside a .hero card body, where rows sit flush instead of boxed.
const rowClass = (bare) =>
  `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 ${
    bare ? "border-0 bg-[var(--raised)]" : "border border-[var(--border)] bg-[var(--surface)]"
  }`;
const RANGE_BASE = "flex-[2] min-w-[90px] accent-[var(--honey)]";
const THUMB =
  "appearance-none h-2 rounded [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--bg)] [&::-webkit-slider-thumb]:bg-white";
// minimal track: an almost-invisible hairline groove with a small plain dot handle
const MINIMAL_TRACK =
  "appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[var(--separator-opaque)] " +
  "[&::-moz-range-track]:h-[2px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--separator-opaque)] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[12px] [&::-webkit-slider-thumb]:w-[12px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[var(--text)] " +
  "[&::-moz-range-thumb]:h-[12px] [&::-moz-range-thumb]:w-[12px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--text)]";
const segBtnClass = (active) =>
  `rounded-md border-0 bg-transparent px-[10px] py-1 text-[0.8rem] text-[var(--muted)] ${
    active ? "bg-[var(--honey)] font-semibold text-[#1b2130]" : ""
  }`;
const cmdClass =
  "rounded-lg border border-[var(--honey)] bg-transparent px-[14px] py-[6px] text-[0.85rem] text-[var(--honey)] hover:bg-[var(--honey-dim)]";

// ------------------------------------------------------------- primitives

function ToggleButton({ on, onClick, width = "13.25rem", height = "7rem", children }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{ width, height }}
      className={`relative shrink-0 rounded-full border-0 p-0 bg-[var(--fill-tertiary)] ${on ? "shadow-[1px_1px_2px_0px_#FFFFFF1A_inset]" : "shadow-[0px_3px_3px_0px_#0000000A,1px_1px_2px_0px_#FFFFFF1A_inset]"}`}
    >
      {children}
    </button>
  );
}

export function Toggle({ label, value, onChange, icon: Icon = PowerIcon, bare, width, height }) {
  const on = !!value;
  return (
    <label className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <ToggleButton on={on} onClick={() => onChange(!value)} width={width} height={height}>
        <span
          className={`absolute top-1/2 -translate-y-1/2 text-[17px] font-semibold text-[var(--label-secondary)] ${on ? "left-8" : "right-8"}`}
        >
          <p>{on ? "On" : "Off"}</p>
        </span>
        <span
          className={`absolute top-1/2 flex h-25 w-25 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_2px_8px_var(--soft-cast-lifted)] transition-[left] duration-150 ease-in-out ${on ? "left-[calc(100%_-_6.25rem_-_6px)] bg-[var(--static-white)]" : "left-[6px] bg-transparent"}`}
        >
          <Icon className="h-9 w-9 object-contain" />
        </span>
      </ToggleButton>
    </label>
  );
}

function RangeInput({ className = "", ...props }) {
  return <input type="range" className={`${RANGE_BASE} w-full !h-[60px] ${className}`} {...props} />;
}

export function Slider({ expose, label, value, onChange, bare }) {
  const lo = expose.value_min ?? 0;
  const hi = expose.value_max ?? 100;
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <RangeInput
        className={MINIMAL_TRACK}
        min={lo}
        max={hi}
        step={expose.value_step ?? 1}
        value={value ?? lo}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="font-mono text-[0.85rem] text-[var(--muted)]">
        {value ?? lo}
        {unit(expose)}
      </span>
    </div>
  );
}

export function StepperInput({ expose, label, value, onChange, bare }) {
  const step = expose.value_step ?? 0.5;
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <div className="flex items-center gap-1">
        <button
          className="h-[30px] w-[30px] rounded-lg border border-[var(--border)] bg-[var(--raised)] text-base leading-none"
          onClick={() => onChange(+(Number(value ?? 0) - step).toFixed(2))}
        >
          −
        </button>
        <span className="min-w-16 text-center font-mono text-[0.9rem]">
          {value ?? 0}
          {unit(expose)}
        </span>
        <button
          className="h-[30px] w-[30px] rounded-lg border border-[var(--border)] bg-[var(--raised)] text-base leading-none"
          onClick={() => onChange(+(Number(value ?? 0) + step).toFixed(2))}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`rounded-md border border-[var(--border)] bg-[var(--raised)] px-2 py-[5px] text-[var(--text)] ${className}`}
      {...props}
    />
  );
}

export function NumberInput({ expose, label, value, onChange }) {
  return (
    <label className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <span className="flex items-center">
        <Input
          type="number"
          className="w-[90px] font-mono"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {unit(expose) && <span className="ml-1 text-[0.78rem] text-[var(--muted)]">{unit(expose)}</span>}
      </span>
    </label>
  );
}

export function Select({ expose, label, value, onChange }) {
  return (
    <label className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <select
        className="max-w-[190px] rounded-md border border-[var(--border)] bg-[var(--raised)] px-2 py-[5px] text-[var(--text)]"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {(expose.values ?? []).map((v) => (
          <option key={v} value={v}>
            {humanize(v)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl({ expose, label, value, onChange, bare }) {
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <div className="flex flex-wrap rounded-lg bg-[var(--raised)] p-0.5" role="radiogroup" aria-label={label}>
        {(expose.values ?? []).map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            className={segBtnClass(value === v)}
            onClick={() => onChange(v)}
          >
            {humanize(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CommandButton({ expose, label, onChange }) {
  const cmd = expose.values?.[0];
  return (
    <div className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <button className={cmdClass} onClick={() => onChange(cmd ?? label)}>
        {label}
      </button>
    </div>
  );
}

export function TextInput({ label, value, onChange }) {
  return (
    <label className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <Input type="text" className="w-[140px]" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export const TextRow = ({ label, value }) => (
  <div className={rowClass()}>
    <span className="flex-1 text-[0.85rem]">{label}</span>
    <span className="font-mono text-[0.85rem] text-[var(--muted)]">{value || "—"}</span>
  </div>
);

export const Badge = ({ label, value }) => (
  <div className={rowClass()}>
    <span className="flex-1 text-[0.85rem]">{label}</span>
    <span className="rounded-full bg-[var(--raised)] px-[10px] py-0.5 text-[0.78rem] text-[var(--text)]">
      {humanize(String(value ?? "—"))}
    </span>
  </div>
);

export function DurationInput({ label, value, onChange }) {
  return (
    <label className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <span className="flex items-center">
        <Input
          type="number"
          className="w-[90px] font-mono"
          min={0}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="ml-1 text-[0.78rem] text-[var(--muted)]">s</span>
      </span>
    </label>
  );
}

export function CompositeForm({ expose }) {
  const [vals, setVals] = useState({});
  return (
    <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <summary className="cursor-pointer text-[0.85rem]">
        {expose.name ?? humanize(expose.property ?? "Settings")}
      </summary>
      {(expose.features ?? []).map((f) => {
        const key = f.property;
        const v = vals[key] ?? demoFeature(f);
        const set = (x) => setVals((s) => ({ ...s, [key]: x }));
        return <FeatureControl key={key} feature={f} value={v} onChange={set} />;
      })}
    </details>
  );
}

export function ListEditor({ expose }) {
  return (
    <div className={rowClass()}>
      <span className="flex-1 text-[0.85rem]">{expose.name ?? humanize(expose.property)}</span>
      <span className="rounded-full bg-[var(--raised)] px-[10px] py-0.5 text-[0.78rem] text-[var(--muted)]">
        list · {expose.features?.length ?? 0} fields
      </span>
    </div>
  );
}

export const RawJson = ({ expose }) => (
  <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] p-[10px] font-mono text-[0.7rem]">
    {JSON.stringify(expose, null, 2)}
  </pre>
);

// ---------------------------------------------------------------- tiles

const TILE_BASE =
  "flex flex-col gap-0.5 rounded-lg border px-3 py-[10px] bg-[var(--surface)] border-[var(--border)]";
const TILE_LABEL = "text-[0.72rem] tracking-wide text-[var(--muted)] uppercase";
const TILE_VALUE = "text-[1.25rem] font-medium";

export function SensorTile({ expose, label, value }) {
  return (
    <div className={TILE_BASE}>
      <span className={TILE_LABEL}>{label}</span>
      <span className={`${TILE_VALUE} font-mono`}>
        {value ?? "—"}
        <small className="ml-[3px] text-[0.72rem] text-[var(--muted)]">{unit(expose)}</small>
      </span>
    </div>
  );
}

export function StateTile({ label, value, opts = {} }) {
  const on = opts.invert ? !value : !!value;
  const text = on ? (opts.onLabel ?? "On") : (opts.offLabel ?? "Off");
  return (
    <div className={`${TILE_BASE} ${on ? "border-[var(--ok)]" : ""}`}>
      <span className={TILE_LABEL}>{label}</span>
      <span className={`${TILE_VALUE} ${on ? "text-[var(--ok)]" : ""}`}>{text}</span>
    </div>
  );
}

export function AlarmTile({ label, value, opts = {} }) {
  const tripped = !!value;
  const danger = tripped && opts.danger;
  const warn = tripped && !opts.danger;
  return (
    <div
      className={`${TILE_BASE} ${danger ? "border-[var(--danger)] bg-[rgba(229,83,75,0.08)]" : ""} ${warn ? "border-[var(--warn)]" : ""}`}
    >
      <span className={TILE_LABEL}>{label}</span>
      <span
        className={`${TILE_VALUE} ${!tripped ? "text-[var(--ok)] text-[0.95rem]" : ""} ${danger ? "text-[var(--danger)]" : ""} ${warn ? "text-[var(--warn)]" : ""}`}
      >
        {tripped ? "Triggered" : "Clear"}
      </span>
    </div>
  );
}

export const EnergyTile = SensorTile;

export function BatteryPill({ value }) {
  const pct = typeof value === "number" ? value : 100;
  const low = pct <= 20;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-[10px] py-1 font-mono text-[0.78rem] ${
        low ? "border-[var(--danger)] text-[var(--danger)]" : "border-[var(--border)]"
      } bg-[var(--surface)]`}
      title="Battery"
    >
      <span className="inline-flex h-[10px] w-5 rounded-[2px] border border-current p-px">
        <span className="rounded-[1px] bg-current" style={{ width: `${Math.max(4, pct)}%` }} />
      </span>
      {pct}%
    </span>
  );
}

export function EventFeed({ expose }) {
  const [last, setLast] = useState(null);
  const chipClass =
    "rounded-full border border-[var(--border)] bg-[var(--surface)] px-[10px] py-1 text-[0.78rem] text-[var(--text)] hover:border-[var(--honey)]";
  return (
    <div className="flex flex-col gap-2">
      <div className={rowClass()}>
        <span className="flex-1 text-[0.85rem]">Last action</span>
        <span className="rounded-full bg-[var(--raised)] px-[10px] py-0.5 text-[0.78rem] text-[var(--text)]">
          {last ? humanize(last) : "waiting…"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(expose.values ?? []).slice(0, 12).map((v) => (
          <button key={v} className={chipClass} onClick={() => setLast(v)}>
            {humanize(v)}
          </button>
        ))}
        {(expose.values?.length ?? 0) > 12 && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-[10px] py-1 text-[0.78rem] text-[var(--muted)]">
            +{expose.values.length - 12} more
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------- light sub-feature widgets

export function BrightnessSlider(props) {
  return <Slider {...props} label={props.label || "Brightness"} />;
}

export function ColorTempSlider({ expose, label, value, onChange, bare }) {
  const lo = expose.value_min ?? 150;
  const hi = expose.value_max ?? 500;
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label || "Color temp"}</span>
      <RangeInput
        className={`${THUMB} bg-[linear-gradient(to_right,#aecbff,#fff6e0,#ffb84d)]`}
        min={lo}
        max={hi}
        value={value ?? lo}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="font-mono text-[0.85rem] text-[var(--muted)]">{value ?? lo} mired</span>
    </div>
  );
}

export function ColorWheel({ label, value, onChange, bare }) {
  const hue = typeof value === "number" ? value : 42;
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label || "Color"}</span>
      <RangeInput
        className={`${THUMB} bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]`}
        min={0}
        max={360}
        value={hue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span
        className="h-[22px] w-[22px] rounded-full border-2 border-[var(--border)]"
        style={{ background: `hsl(${hue} 90% 60%)` }}
      />
    </div>
  );
}

export function EffectPicker({ expose, label, value, onChange }) {
  return <Select expose={expose} label={label || "Effect"} value={value} onChange={onChange} />;
}

// ------------------------------------------------- one feature -> widget

export function FeatureControl({ feature: f, value, onChange }) {
  const label = humanize(f.property ?? f.base ?? "");
  if (f.values && f.values.length) {
    const vals = f.values.filter((v) => v !== "TOGGLE");
    if (vals.every((v) => v === "ON" || v === "OFF"))
      return <Toggle label={label} value={value === true || value === "ON"} onChange={(on) => onChange(on ? "ON" : "OFF")} />;
    return vals.length <= 4 ? (
      <SegmentedControl expose={{ values: vals }} label={label} value={value} onChange={onChange} />
    ) : (
      <Select expose={{ values: vals }} label={label} value={value} onChange={onChange} />
    );
  }
  if (f.value_min !== undefined && f.value_max !== undefined)
    return <Slider expose={f} label={label} value={value} onChange={onChange} />;
  if (f.readable && f.unit)
    return <TextRow label={label} value={`${value ?? "—"} ${f.unit}`} />;
  return <TextRow label={label} value={String(value ?? "—")} />;
}

// ------------------------------------------------------- grouped cards

function useFeatureState(expose) {
  const [vals, setVals] = useState(() =>
    Object.fromEntries((expose.features ?? []).map((f) => [f.property, demoFeature(f)]))
  );
  const set = (key) => (x) => setVals((s) => ({ ...s, [key]: x }));
  return [vals, set];
}

const epLabel = (expose, fallback) =>
  expose.endpoint ? `${fallback} · ${expose.endpoint}` : fallback;

const heroClass = (on) =>
  `flex flex-col gap-[10px] rounded-[var(--radius)] border bg-[var(--surface)] p-[14px] ${
    on ? "border-[var(--honey)]" : "border-[var(--border)]"
  }`;
const HERO_HEAD = "flex items-center justify-between gap-[10px]";
const HERO_TITLE = "text-[0.95rem] font-semibold";

export function LightCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const feats = expose.features ?? [];
  const by = (b) => feats.find((f) => (f.base ?? f.property) === b);
  const state = by("state");
  const on = vals[state?.property] === true || vals[state?.property] === "ON";
  const order = ["brightness", "color_temp", "color_xy", "color_hs"];
  const WIDGET = { brightness: BrightnessSlider, color_temp: ColorTempSlider, color_xy: ColorWheel, color_hs: ColorWheel };
  return (
    <div className={heroClass(on)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Light")}</span>
        {state && (
          <Toggle label="" value={on} onChange={(x) => set(state.property)(x ? "ON" : "OFF")} bare />
        )}
      </div>
      {order.map((b) => {
        const f = by(b);
        if (!f) return null;
        const W = WIDGET[b];
        return <W key={b} expose={f} label={humanize(b)} value={vals[f.property]} onChange={set(f.property)} bare />;
      })}
    </div>
  );
}

export function SwitchCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const state = (expose.features ?? []).find((f) => (f.base ?? f.property) === "state");
  if (!state) return null;
  const on = vals[state.property] === true || vals[state.property] === "ON";
  return (
    <div className={heroClass(on)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Switch")}</span>
        <Toggle label="" value={on} onChange={(x) => set(state.property)(x ? "ON" : "OFF")} bare />
      </div>
    </div>
  );
}

export function CoverCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const feats = expose.features ?? [];
  const pos = feats.find((f) => (f.base ?? f.property) === "position");
  const tilt = feats.find((f) => (f.base ?? f.property) === "tilt");
  const [state, setState] = useState("STOP");
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Cover")}</span>
        <div className="flex flex-wrap rounded-lg bg-[var(--raised)] p-0.5">
          {["OPEN", "STOP", "CLOSE"].map((c) => (
            <button key={c} className={segBtnClass(state === c)} onClick={() => setState(c)}>
              {humanize(c.toLowerCase())}
            </button>
          ))}
        </div>
      </div>
      {pos && <Slider expose={pos} label="Position" value={vals[pos.property]} onChange={set(pos.property)} bare />}
      {tilt && <Slider expose={tilt} label="Tilt" value={vals[tilt.property]} onChange={set(tilt.property)} bare />}
    </div>
  );
}

export function LockCard({ expose }) {
  const [locked, setLocked] = useState(true);
  return (
    <div className={heroClass(locked)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Lock")}</span>
        <button className={cmdClass} onClick={() => setLocked(!locked)}>
          {locked ? "🔒 Locked — tap to unlock" : "🔓 Unlocked — tap to lock"}
        </button>
      </div>
    </div>
  );
}

export function ClimateCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const feats = expose.features ?? [];
  const by = (b) => feats.find((f) => (f.base ?? f.property) === b);
  const setpoint = by("occupied_heating_setpoint") ?? by("current_heating_setpoint") ?? by("occupied_cooling_setpoint");
  const local = by("local_temperature");
  const mode = by("system_mode") ?? by("preset");
  const running = by("running_state");
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Thermostat")}</span>
        {running && (
          <span className="rounded-full bg-[var(--raised)] px-[10px] py-0.5 text-[0.78rem] text-[var(--text)]">
            {humanize(String(vals[running.property] ?? "idle"))}
          </span>
        )}
      </div>
      <div className="flex items-stretch gap-[10px]">
        <div className={`${TILE_BASE} flex-1`}>
          <span className={TILE_LABEL}>Current</span>
          <span className={`${TILE_VALUE} font-mono`}>
            {vals[local?.property] ?? 21.4}
            <small className="ml-[3px] text-[0.72rem] text-[var(--muted)]">°C</small>
          </span>
        </div>
        {setpoint && (
          <div className="flex-[2]">
            <StepperInput
              expose={setpoint}
              label="Target"
              value={vals[setpoint.property]}
              onChange={set(setpoint.property)}
              bare
            />
          </div>
        )}
      </div>
      {mode && mode.values && (
        <SegmentedControl expose={mode} label="Mode" value={vals[mode.property]} onChange={set(mode.property)} bare />
      )}
    </div>
  );
}

export function FanCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const feats = expose.features ?? [];
  const state = feats.find((f) => (f.base ?? f.property) === "state" || (f.base ?? f.property) === "fan_state");
  const mode = feats.find((f) => (f.base ?? f.property) === "mode" || (f.base ?? f.property) === "fan_mode");
  const on = state && (vals[state.property] === true || vals[state.property] === "ON");
  return (
    <div className={heroClass(!!on)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Fan")}</span>
        {state && (
          <Toggle
            label=""
            value={!!on}
            onChange={(x) => set(state.property)(x ? "ON" : "OFF")}
            icon={FanIcon}
            bare
          />
        )}
      </div>
      {mode && mode.values && (
        <SegmentedControl expose={mode} label="Speed" value={vals[mode.property]} onChange={set(mode.property)} bare />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- lookup

export const WIDGETS = {
  Toggle, Slider, StepperInput, NumberInput, Select, SegmentedControl,
  CommandButton, TextInput, TextRow, Badge, DurationInput, CompositeForm,
  ListEditor, RawJson, SensorTile, StateTile, AlarmTile, EnergyTile,
  BatteryPill, EventFeed, BrightnessSlider, ColorTempSlider, ColorWheel,
  EffectPicker, LightCard, SwitchCard, CoverCard, LockCard, ClimateCard, FanCard,
};
