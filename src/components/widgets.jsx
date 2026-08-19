// One React component per registry name. Every widget takes:
//   { expose, label, opts, value, onChange }
// Grouped cards (LightCard, ClimateCard, ...) manage their features internally.

import { useRef, useState } from "react";
import { demoFeature } from "../demo.js";
import { humanize } from "../registry.js";
import {
  PowerIcon,
  FanIcon,
  SunIcon,
  LowBrightnessIcon,
  HighBrightnessIcon,
  BoltIcon,
  LockOpenIcon,
  LockClosedIcon,
} from "../icons";

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

// range input thumb styles: a thin bar that blends into the fill (brightness),
// or a distinct round knob that sits on top of a non-fill background (temp/level)
const THUMB_BAR =
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[999] [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:w-[4px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-none " +
  "[&::-moz-range-thumb]:relative [&::-moz-range-thumb]:z-[999] [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-[4px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white";
const THUMB_DOT =
  "thumb-grip " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-[999] [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.35)] " +
  "[&::-moz-range-thumb]:relative [&::-moz-range-thumb]:z-[999] [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.35)]";

const cmdClass =
  "rounded-lg border border-[var(--honey)] bg-transparent px-[14px] py-[6px] text-[0.85rem] text-[var(--honey)] hover:bg-[var(--honey-dim)]";

// fill-tertiary + inner-shadow row used for "Current / Battery / Power" style
// info rows across device screens (distinct from TILE_BASE, which is the
// bordered/surface style used by the standalone gallery tiles).
const INFO_ROW =
  "flex min-h-16 items-center gap-3 rounded-2xl bg-[var(--fill-tertiary)] px-4 py-3 shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]";

// tone: optional semantic color for the value — "ok"/"warn"/"danger" tint the
// text, and warn/danger also add the same colored ring CircleStat uses for
// its triggered state.
const TONE_TEXT = { ok: "text-[var(--ok)]", warn: "text-[var(--warn)]", danger: "text-[var(--danger)]" };
const TONE_RING = {
  warn: "shadow-[0_0_0_2px_var(--warn),1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]",
  danger: "shadow-[0_0_0_2px_var(--danger),1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]",
};

export function InfoRow({ label, value, unit: unitStr = "", icon: Icon, trailing, tone }) {
  return (
    <div className={`${INFO_ROW} ${TONE_RING[tone] ?? ""}`}>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[0.8rem] text-[var(--muted)]">{label}</span>
        <span className={`text-[1.05rem] font-semibold ${TONE_TEXT[tone] ?? "text-[var(--text)]"}`}>
          {value}
          {unitStr && <span className="ml-0.5 text-[0.8rem] font-normal text-[var(--muted)]">{unitStr}</span>}
        </span>
      </div>
      {Icon && <Icon className="h-6 w-6 shrink-0 text-[var(--text)]" />}
      {trailing}
    </div>
  );
}

// round sensor badge — Air quality / Gas / Illuminance readouts
export function CircleStat({ label, value, danger }) {
  return (
    <div
      className={`flex aspect-square w-[9.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-full bg-[var(--fill-tertiary)] text-center shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset] ${
        danger ? "shadow-[0_0_0_2px_var(--danger),1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]" : ""
      }`}
    >
      <span className="text-[0.9rem] text-[var(--muted)]">{label}</span>
      <span className={`text-[1.25rem] font-bold ${danger ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
        {value}
      </span>
    </div>
  );
}

// text-pill segmented control — AC Mode / Fan speed / Timer presets. Distinct
// from SegmentedControl (dot-slider), which the simpler thermostat card uses.
export function PillSegmented({ options, value, onChange, label }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {label && <span className="text-[0.85rem]">{label}</span>}
      <div className="flex w-full gap-1 rounded-full bg-[rgba(255,255,255,0.16)] p-0.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-full border-0 bg-transparent px-2 py-[9px] text-[0.83rem] whitespace-nowrap text-[var(--text)] ${
                active ? "bg-[rgba(255,255,255,0.27)] font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.25)]" : ""
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// small iOS-style row switch — Swing / Timer, distinct from the big centered
// Toggle molecule; track is fill-tertiary off, systemGreen on.
export function MiniSwitch({ label, icon: Icon, on, onChange, children }) {
  return (
    <div className={`${INFO_ROW} flex-col items-stretch gap-3`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-[var(--muted)]" />}
        <span className="flex-1 text-[1rem] text-[var(--text)]">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(!on)}
          className={`relative h-[31px] w-[51px] shrink-0 rounded-full border-0 p-0 transition-colors duration-150 ${
            on ? "bg-[#30d158]" : "bg-[var(--fill-tertiary)]"
          }`}
        >
          <span
            className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-[left] duration-150 ${
              on ? "left-[22px]" : "left-[2px]"
            }`}
          />
        </button>
      </div>
      {on && children}
    </div>
  );
}

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

export function Toggle({ label, value, onChange, icon: Icon = PowerIcon, bare, plain, width, height }) {
  const on = !!value;
  const button = (
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
  );

  // `plain`: the big centered on/off toggle used as a card's primary control —
  // sits directly on the card background with no row chrome, matching Figma
  // (the toggle's padding frame carries no fill of its own).
  if (plain) return <div className="flex justify-center py-3">{button}</div>;

  return (
    <label className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      {button}
    </label>
  );
}

// modeType: "brightness" (default) — white fill bar, thumb blends in
//           "temp" — full-width --gradient-color-temp background, no fill split, round white knob
function RangeInput({
  className = "",
  min = 0,
  max = 100,
  step = 1,
  value,
  fillColor = "var(--static-white)",
  modeType = "brightness",
  startIcon: StartIcon,
  endIcon: EndIcon,
  ...props
}) {
  const pct = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;
  const background =
    modeType === "temp"
      ? "var(--gradient-color-temp)"
      : `linear-gradient(to right, ${fillColor} ${pct}%, var(--fill-tertiary) ${pct}%)`;
  const thumb = modeType === "brightness" ? THUMB_BAR : THUMB_DOT;

  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ background }}
        className={`w-full appearance-none rounded-full shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset] h-[50px] px-[3px] ${thumb} ${className}`}
        {...props}/>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 z-5">
          {StartIcon && <StartIcon className="h-4 w-4 opacity-70 z-6" />}
          {EndIcon && <EndIcon className="h-4 w-4" />}
        </div>
    </div>
  );
}

// discrete range: exactly `dots` stopping positions, thumb only lands on those
// checkpoints (native step does the snapping), with a dot marker at each stop.
function ModeInput({ className = "", dots = 8, startLabel = "easy", endLabel = "hard", value, onChange, ...props }) {
  const stops = Array.from({ length: dots }, (_, i) => i);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex justify-between px-3 text-[15px] text-[var(--muted)]">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <div className="relative w-full">
        <input
          type="range"
          min={0}
          max={dots - 1}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full appearance-none rounded-full bg-[var(--fill-tertiary)] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset] h-[50px] px-[3px] ${THUMB_DOT} ${className}`}
          {...props}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-[21px]">
          {stops.map((stop) => (
            <span
              key={stop}
              className={`h-2 w-2 rounded-full ${stop <= Number(value) ? "bg-white" : "bg-[var(--separator-opaque)]"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Slider({ expose, label, value, onChange, bare, fillColor, modeType, startIcon, endIcon }) {
  const lo = expose.value_min ?? 0;
  const hi = expose.value_max ?? 100;
  return (
    <div className={`${rowClass(bare)} flex flex-col`}>
      <div className="w-full flex justify-between px-3">
        <span className="flex-1 text-md">{label}</span>
        <span className="font-mono text-md text-[var(--muted)]">
          {value ?? lo}
          {unit(expose)}
        </span>
      </div>
      <RangeInput
        className=""
        min={lo}
        max={hi}
        step={expose.value_step ?? 1}
        value={value ?? lo}
        onChange={(e) => onChange(Number(e.target.value))}
        fillColor={fillColor}
        modeType={modeType}
        startIcon={startIcon}
        endIcon={endIcon}
      />
    </div>
  );
}

const RING_SIZE = 180;
const RING_R = 72;
const RING_STROKE = 20;
const RING_START = 225;
const RING_SWEEP = 270;
const RING_END = RING_START + RING_SWEEP;

function ringPoint(deg, r = RING_R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const c = RING_SIZE / 2;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}

function ringArcPath(startDeg, endDeg, r = RING_R) {
  const start = ringPoint(startDeg, r);
  const end = ringPoint(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// fixed tick positions across the whole sweep — computed once, never re-derived
// from the current value, so they never appear to shift as the knob moves
const RING_DOT_COUNT = 12;
const RING_DOTS = Array.from(
  { length: RING_DOT_COUNT },
  (_, i) => RING_START + (RING_SWEEP * (i + 0.5)) / RING_DOT_COUNT
);

export function StepperInput({ expose, label, value, onChange, bare, topLabel, caption }) {
  const lo = expose.value_min ?? 5;
  const hi = expose.value_max ?? 35;
  const step = expose.value_step ?? 0.5;
  const v = Math.min(hi, Math.max(lo, Number(value ?? lo)));
  const fraction = (v - lo) / (hi - lo);
  const valueDeg = RING_START + RING_SWEEP * fraction;
  const svgRef = useRef(null);

  const setFromAngle = (deg) => {
    let rel = (((deg - RING_START) % 360) + 360) % 360;
    if (rel > RING_SWEEP) rel = rel - RING_SWEEP < 360 - rel ? RING_SWEEP : 0;
    const raw = lo + (rel / RING_SWEEP) * (hi - lo);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.min(hi, Math.max(lo, Number(stepped.toFixed(2)))));
  };

  const angleFromClient = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const mathDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return ((mathDeg + 90) % 360 + 360) % 360;
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    svgRef.current.setPointerCapture(e.pointerId);
    setFromAngle(angleFromClient(e.clientX, e.clientY));
  };
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return;
    setFromAngle(angleFromClient(e.clientX, e.clientY));
  };

  const knob = ringPoint(valueDeg);

  return (
    <div className={`${rowClass(bare)} flex flex-col items-center gap-2 py-4`}>
      <span className="w-full text-left text-[0.85rem]">{label}</span>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="h-[180px] w-[180px] cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3aa0ff" />
            <stop offset="55%" stopColor="#3ad0a0" />
            <stop offset="100%" stopColor="#ffd23f" />
          </linearGradient>
        </defs>
        <path
          d={ringArcPath(RING_START, RING_END)}
          fill="none"
          stroke="var(--fill-quaternary)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
        />
        {RING_DOTS.map((deg, i) => {
          const p = ringPoint(deg);
          return <circle key={i} cx={p.x} cy={p.y} r={2} fill="var(--separator-opaque)" />;
        })}
        {fraction > 0 && (
          <path
            d={ringArcPath(RING_START, valueDeg)}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
          />
        )}

        <circle
          cx={knob.x}
          cy={knob.y}
          r={11}
          fill="var(--static-white)"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />
        {topLabel ? (
          <>
            <text
              x={RING_SIZE / 2}
              y={RING_SIZE / 2 - 22}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[12px] font-semibold"
            >
              {topLabel}
            </text>
            <text
              x={RING_SIZE / 2}
              y={RING_SIZE / 2 + 6}
              textAnchor="middle"
              className="fill-[var(--text)] font-mono text-[28px] font-bold"
            >
              {v}
            </text>
            <text
              x={RING_SIZE / 2}
              y={RING_SIZE / 2 + 26}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[12px]"
            >
              {unit(expose)}
            </text>
          </>
        ) : (
          <text
            x={RING_SIZE / 2}
            y={RING_SIZE / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--text)] font-mono text-[22px]"
          >
            {v}
            {unit(expose)}
          </text>
        )}
      </svg>
      {caption && <span className="text-center text-[0.78rem] text-[var(--muted)]">{caption}</span>}
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
  const values = expose.values ?? [];
  const index = Math.max(0, values.indexOf(value));
  return (
    <div className={`${rowClass(bare)} flex flex-col`}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <ModeInput
        aria-label={label}
        dots={values.length || 1}
        startLabel={humanize(values[0] ?? "")}
        endLabel={humanize(values[values.length - 1] ?? "")}
        value={index}
        onChange={(i) => onChange(values[i])}
      />
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

export const TextRow = ({ label, value }) => <InfoRow label={label} value={value || "—"} />;

export const Badge = ({ label, value }) => <InfoRow label={label} value={humanize(String(value ?? "—"))} />;

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
// all built on InfoRow — the fill-tertiary/inner-shadow row pixel-matched to
// Figma's "Current temperature / Battery / Power" device-screen rows.

export function SensorTile({ expose, label, value }) {
  return <InfoRow label={label} value={value ?? "—"} unit={unit(expose)} />;
}

export function StateTile({ label, value, opts = {} }) {
  const on = opts.invert ? !value : !!value;
  const text = on ? (opts.onLabel ?? "On") : (opts.offLabel ?? "Off");
  return <InfoRow label={label} value={text} tone={on ? "ok" : undefined} />;
}

export function AlarmTile({ label, value, opts = {} }) {
  const tripped = !!value;
  const tone = tripped ? (opts.danger ? "danger" : "warn") : "ok";
  return <InfoRow label={label} value={tripped ? "Triggered" : "Clear"} tone={tone} />;
}

export const EnergyTile = SensorTile;

export function BatteryPill({ value }) {
  const pct = typeof value === "number" ? value : 100;
  return <InfoRow label="Battery" value={pct} unit="%" icon={BoltIcon} />;
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

// custom bar: hairline track with a round handle that carries a swappable icon
export function Bar({ expose = {}, label, value, onChange, icon: Icon = SunIcon, startIcon: StartIcon, endIcon: EndIcon, bare }) {
  const lo = expose.value_min ?? 0;
  const hi = expose.value_max ?? 100;
  const step = expose.value_step ?? 1;
  const v = value ?? lo;
  const pct = ((v - lo) / (hi - lo)) * 100;
  const trackRef = useRef(null);

  const setFromClientX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = lo + ratio * (hi - lo);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.min(hi, Math.max(lo, stepped)));
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    trackRef.current.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return;
    setFromClientX(e.clientX);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(hi, v + step));
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(lo, v - step));
    else if (e.key === "Home") onChange(lo);
    else if (e.key === "End") onChange(hi);
  };

  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label}</span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-valuenow={v}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="relative flex h-8 flex-[2] min-w-[90px] cursor-pointer touch-none items-center select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[var(--separator-opaque)]" />
        {StartIcon && (
          <StartIcon className="pointer-events-none absolute top-1/2 left-1 h-4 w-4 -translate-y-1/2 opacity-70" />
        )}
        {EndIcon && <EndIcon className="pointer-events-none absolute top-1/2 right-1 h-4 w-4 -translate-y-1/2" />}
        <div
          className="pointer-events-none absolute top-1/2 z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--static-white)] shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
          style={{ left: `${pct}%` }}
        >
          <Icon className="h-3.5 w-3.5 stroke-[var(--accent-orange)]" strokeWidth="2" fill="none" />
        </div>
      </div>
      <span className="font-mono text-[0.85rem] text-[var(--muted)]">
        {v}
        {unit(expose)}
      </span>
    </div>
  );
}

export function BrightnessSlider(props) {
  return (
    <Slider
      {...props}
      label={props.label || "Brightness"}
      startIcon={props.startIcon || LowBrightnessIcon}
      endIcon={props.endIcon || HighBrightnessIcon}
    />
  );
}

export function ColorTempSlider({ expose, label, value, onChange, bare }) {
  const lo = expose.value_min ?? 150;
  const hi = expose.value_max ?? 500;
  return (
    <div className={rowClass(bare)}>
      <span className="flex-1 text-[0.85rem]">{label || "Color temp"}</span>
      <RangeInput
        className={`!h-4 !bg-[linear-gradient(to_right,#aecbff,#fff6e0,#ffb84d)]`}
        min={lo}
        max={hi}
        value={value ?? lo}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="font-mono text-[0.85rem] text-[var(--muted)]">{value ?? lo} mired</span>
    </div>
  );
}

const COLOR_PRESETS = ["#fdf6ec", "#1e9bf0", "#2fe0a8", "#f0355a", "#8b5cf6"];
// glow center + conic "from" angle are shared constants so the picker's angle
// math stays in sync with what the gradient actually paints at that point
const FIELD_GLOW = { xPct: 50, yPct: 38 };
const FIELD_FROM_DEG = 200;
const COLOR_FIELD_BG =
  `radial-gradient(circle at ${FIELD_GLOW.xPct}% ${FIELD_GLOW.yPct}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 45%), ` +
  `conic-gradient(from ${FIELD_FROM_DEG}deg, hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 55%), hsl(180 90% 55%), hsl(240 90% 55%), hsl(300 90% 55%), hsl(360 90% 55%))`;

export function ColorWheel({ label, value, onChange, bare }) {
  const color = typeof value === "string" ? value : COLOR_PRESETS[4];
  const fieldRef = useRef(null);
  const [pos, setPos] = useState({ x: 30, y: 28 });

  const pickAt = (clientX, clientY) => {
    const rect = fieldRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setPos({ x, y });

    const cx = (rect.width * FIELD_GLOW.xPct) / 100;
    const cy = (rect.height * FIELD_GLOW.yPct) / 100;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const hue = Math.round((((angle - FIELD_FROM_DEG) % 360) + 360) % 360);

    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxDist);
    const sat = Math.round(dist * 90);
    const light = Math.round(100 - dist * 50);

    onChange(`hsl(${hue} ${sat}% ${light}%)`);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    fieldRef.current.setPointerCapture(e.pointerId);
    pickAt(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return;
    pickAt(e.clientX, e.clientY);
  };

  return (
    <div className={`${rowClass(bare)} flex flex-col gap-3`}>
      <span className="text-[0.85rem]">{label || "Color"}</span>
      <div className="flex w-full gap-3">
        <div className="flex flex-col justify-between gap-2 py-1">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`h-6 w-6 rounded-full border-0 ${
                color === p ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--raised)]" : ""
              }`}
              style={{ background: p }}
              aria-label={p}
            />
          ))}
        </div>
        <div
          ref={fieldRef}
          role="slider"
          tabIndex={0}
          aria-label={label || "Color"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="relative h-[160px] flex-1 cursor-pointer touch-none rounded-2xl"
          style={{ background: COLOR_FIELD_BG }}
        >
          <div
            className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, background: color }}
          />
        </div>
      </div>
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
      </div>
      {state && <Toggle value={on} onChange={(x) => set(state.property)(x ? "ON" : "OFF")} plain />}
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
  const feats = expose.features ?? [];
  const state = feats.find((f) => (f.base ?? f.property) === "state");
  if (!state) return null;
  const on = vals[state.property] === true || vals[state.property] === "ON";
  const by = (b) => feats.find((f) => (f.base ?? f.property) === b);
  const power = by("power");
  const voltage = by("voltage");
  const current = by("current");
  const energy = by("energy");
  return (
    <div className={heroClass(on)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Switch")}</span>
      </div>
      <Toggle value={on} onChange={(x) => set(state.property)(x ? "ON" : "OFF")} plain />
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Power" value={power ? (vals[power.property] ?? 0) : 42} unit="W" />
        <InfoRow label="Voltage" value={voltage ? (vals[voltage.property] ?? 0) : 231} unit="V" />
        <InfoRow label="Current" value={current ? (vals[current.property] ?? 0) : 0.18} unit="A" />
        <InfoRow label="Energy (total)" value={energy ? (vals[energy.property] ?? 0) : 128.4} unit="kWh" />
      </div>
    </div>
  );
}

// vertical fill bar — drag up/down to set cover position, matching the
// shade-style vertical slider used by the Shutter screen (100x220 in Figma).
function VerticalCoverBar({ value, onChange, min = 0, max = 100 }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const trackRef = useRef(null);

  const setFromClientY = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onChange(Math.round(min + ratio * (max - min)));
  };
  const onPointerDown = (e) => {
    e.preventDefault();
    trackRef.current.setPointerCapture(e.pointerId);
    setFromClientY(e.clientY);
  };
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return;
    setFromClientY(e.clientY);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className="relative h-[13.75rem] w-[6.25rem] cursor-pointer touch-none overflow-hidden rounded-[1.5rem] bg-[var(--fill-tertiary)] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]"
    >
      <div className="w-full bg-[var(--static-white)] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]" style={{ height: `${pct}%` }} />
    </div>
  );
}

function CoverPillButton({ children, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-3 border-0 bg-transparent">
      <span className="flex h-14 w-[4.75rem] items-center justify-center rounded-full bg-[var(--fill-tertiary)] text-[var(--text)] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]">
        {children}
      </span>
      <span className="text-[0.8rem] text-[var(--text)]">{label}</span>
    </button>
  );
}

export function CoverCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const feats = expose.features ?? [];
  const pos = feats.find((f) => (f.base ?? f.property) === "position");
  const [localPos, setLocalPos] = useState(58);
  const position = pos ? (vals[pos.property] ?? 0) : localPos;
  const setPosition = pos ? set(pos.property) : setLocalPos;
  const move = (dir) => setPosition(Math.min(100, Math.max(0, position + dir * 10)));

  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Shutter")}</span>
      </div>
      <div className="flex flex-col items-center gap-6 py-2">
        <VerticalCoverBar value={position} onChange={setPosition} />
        <div className="flex gap-6">
          <CoverPillButton label="Up" onClick={() => move(1)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </CoverPillButton>
          <CoverPillButton label="Stop" onClick={() => {}}>
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
              <rect x="2" y="2" width="20" height="20" rx="3" />
            </svg>
          </CoverPillButton>
          <CoverPillButton label="Down" onClick={() => move(-1)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </CoverPillButton>
        </div>
      </div>
    </div>
  );
}

// two static icons side-by-side, selected side gets a white circle behind it
// — this is a different shape than Toggle's single sliding knob, so it's its
// own molecule rather than a Toggle variant.
function LockToggle({ locked, onChange }) {
  return (
    <div className="flex justify-center py-3">
      <div className="flex h-[7rem] w-[13.25rem] items-center gap-0 rounded-full bg-[var(--fill-tertiary)] p-[6px] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex h-25 w-25 flex-1 items-center justify-center rounded-full border-0 ${
            !locked ? "bg-[var(--static-white)] shadow-[0_3px_3px_rgba(0,0,0,0.04)]" : "bg-transparent"
          }`}
        >
          <LockOpenIcon className="h-9 w-9 object-contain" />
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex h-25 w-25 flex-1 items-center justify-center rounded-full border-0 ${
            locked ? "bg-[var(--static-white)] shadow-[0_3px_3px_rgba(0,0,0,0.04)]" : "bg-transparent"
          }`}
        >
          <LockClosedIcon className="h-9 w-9 object-contain" />
        </button>
      </div>
    </div>
  );
}

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];

export function LockCard({ expose }) {
  const [locked, setLocked] = useState(true);
  const [entry, setEntry] = useState("");
  const press = (k) => {
    if (k === "C") setEntry("");
    else if (k === "OK") setEntry("");
    else setEntry((e) => (e + k).slice(0, 8));
  };
  return (
    <div className={heroClass(locked)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Lock")}</span>
      </div>
      <InfoRow label="Current" value={locked ? "Locked" : "Unlocked"} />
      <LockToggle locked={locked} onChange={setLocked} />
      <div className="grid grid-cols-3 gap-3">
        {KEYPAD_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={`rounded-[1.75rem] border-0 py-4 text-[1.05rem] font-semibold shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset] ${
              k === "OK"
                ? "bg-[var(--static-white)] text-[#1b2130]"
                : "bg-[var(--fill-tertiary)] text-[var(--text)]"
            }`}
          >
            {entry.length > 0 && k === "OK" ? entry : k}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="w-full rounded-2xl border-0 bg-[var(--fill-tertiary)] py-3 text-center text-[1rem] font-semibold text-[var(--text)] shadow-[1px_1px_2px_0px_rgba(255,255,255,0.1)_inset]"
      >
        Create guest code
      </button>
      <span className="text-center text-[0.78rem] text-[var(--muted)]">Temporary code 24h expires for guests</span>
    </div>
  );
}

// simple thermostat: current-temp row, big toggle, flat target-temp bar, and
// a dot-slider mode row — matches Figma's "climate thermostat" frame (the
// richer ring-dial + pill-segmented controls live in AirConditionerCard).
export function ClimateCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const [localOn, setLocalOn] = useState(true);
  const feats = expose.features ?? [];
  const by = (b) => feats.find((f) => (f.base ?? f.property) === b);
  const setpoint = by("occupied_heating_setpoint") ?? by("current_heating_setpoint") ?? by("occupied_cooling_setpoint");
  const local = by("local_temperature");
  const mode = by("system_mode") ?? by("preset");
  const running = by("running_state");
  const stateFeat = by("state");
  const on = stateFeat ? vals[stateFeat.property] === true || vals[stateFeat.property] === "ON" : localOn;
  const toggleOn = stateFeat ? (x) => set(stateFeat.property)(x ? "ON" : "OFF") : setLocalOn;
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Thermostat")}</span>
      </div>
      <InfoRow
        label="Current temperature"
        value={vals[local?.property] ?? 21}
        unit="°C"
        trailing={
          running && (
            <span className="text-[0.9rem] font-medium text-[var(--text)]">
              {humanize(String(vals[running.property] ?? "idle"))}
            </span>
          )
        }
      />
      <Toggle value={on} onChange={toggleOn} plain />
      {setpoint && (
        <Slider
          expose={setpoint}
          label="Temperature"
          value={vals[setpoint.property]}
          onChange={set(setpoint.property)}
          bare
        />
      )}
      {mode && mode.values && (
        <SegmentedControl expose={mode} label="Mode" value={vals[mode.property]} onChange={set(mode.property)} bare />
      )}
    </div>
  );
}

// rich ring-dial version — matches Figma's "Air Conditioner" frame: current
// temp row, big toggle, ring target-temp dial with room/humidity caption,
// pill-segmented Mode and Fan speed, plus Swing/Timer mini-switch rows.
export function AirConditionerCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const [localOn, setLocalOn] = useState(true);
  const [swing, setSwing] = useState(true);
  const [timer, setTimer] = useState(false);
  const [timerDir, setTimerDir] = useState("off");
  const [timerDur, setTimerDur] = useState("15");
  const feats = expose.features ?? [];
  const by = (b) => feats.find((f) => (f.base ?? f.property) === b);
  const setpoint = by("occupied_cooling_setpoint") ?? by("occupied_heating_setpoint") ?? by("current_heating_setpoint");
  const local = by("local_temperature");
  const humidity = by("humidity");
  const mode = by("system_mode");
  const fanMode = by("fan_mode");
  const stateFeat = by("state");
  const on = stateFeat ? vals[stateFeat.property] === true || vals[stateFeat.property] === "ON" : localOn;
  const toggleOn = stateFeat ? (x) => set(stateFeat.property)(x ? "ON" : "OFF") : setLocalOn;

  const modeOptions = (mode?.values ?? ["cool", "heat", "dry", "fan", "auto"]).map((v) => ({ value: v, label: humanize(v) }));
  const fanOptions = (fanMode?.values ?? ["auto", "low", "medium", "high"]).map((v) => ({ value: v, label: humanize(v) }));

  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Air Conditioner")}</span>
      </div>
      <Toggle value={on} onChange={toggleOn} plain />
      {setpoint && (
        <StepperInput
          expose={setpoint}
          topLabel="Cool to"
          value={vals[setpoint.property]}
          onChange={set(setpoint.property)}
          caption={`now ${vals[local?.property] ?? 24.6}° · humidity ${vals[humidity?.property] ?? 48}%`}
          bare
        />
      )}
      <PillSegmented label="Mode" options={modeOptions} value={vals[mode?.property] ?? modeOptions[0]?.value} onChange={mode ? set(mode.property) : () => {}} />
      <PillSegmented label="Fan speed" options={fanOptions} value={vals[fanMode?.property] ?? fanOptions[0]?.value} onChange={fanMode ? set(fanMode.property) : () => {}} />
      <MiniSwitch label="Swing" on={swing} onChange={setSwing} />
      <MiniSwitch label="Timer" on={timer} onChange={setTimer}>
        <PillSegmented
          options={[
            { value: "off", label: "Turn off after" },
            { value: "on", label: "Turn on after" },
          ]}
          value={timerDir}
          onChange={setTimerDir}
        />
        <PillSegmented
          options={[15, 30, 60, 120, 240].map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60} hour` }))}
          value={timerDur}
          onChange={setTimerDur}
        />
      </MiniSwitch>
    </div>
  );
}

export function FanCard({ expose }) {
  const [vals, set] = useFeatureState(expose);
  const [localSpeed, setLocalSpeed] = useState(88);
  const feats = expose.features ?? [];
  const state = feats.find((f) => (f.base ?? f.property) === "state" || (f.base ?? f.property) === "fan_state");
  const speed = feats.find((f) => (f.base ?? f.property) === "speed");
  const mode = feats.find((f) => (f.base ?? f.property) === "mode" || (f.base ?? f.property) === "fan_mode");
  const on = state && (vals[state.property] === true || vals[state.property] === "ON");
  return (
    <div className={heroClass(!!on)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Fan")}</span>
      </div>
      {state && (
        <Toggle value={!!on} onChange={(x) => set(state.property)(x ? "ON" : "OFF")} icon={FanIcon} plain />
      )}
      <Slider
        expose={speed ?? { value_min: 0, value_max: 100, unit: "%" }}
        label="Speed"
        value={speed ? vals[speed.property] : localSpeed}
        onChange={speed ? set(speed.property) : setLocalSpeed}
        bare
      />
      {mode && mode.values && (
        <SegmentedControl expose={mode} label="Mode" value={vals[mode.property]} onChange={set(mode.property)} bare />
      )}
    </div>
  );
}

export function AirQualityCard({ expose }) {
  const feats = expose.features ?? [];
  const co2 = feats.find((f) => (f.base ?? f.property) === "co2");
  const value = co2 ? demoFeature(co2) : 620;
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Air Quality")}</span>
      </div>
      <div className="flex justify-center py-2">
        <CircleStat label="CO₂" value={`${value}ppm`} />
      </div>
    </div>
  );
}

export function GasDetectorCard({ expose }) {
  const feats = expose.features ?? [];
  const gas = feats.find((f) => (f.base ?? f.property) === "gas");
  const detected = gas ? !!demoFeature(gas) : false;
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Gas detector")}</span>
      </div>
      <div className="flex justify-center py-2">
        <CircleStat label="Gas" value={detected ? "Detected" : "Clear"} danger={detected} />
      </div>
    </div>
  );
}

export function IlluminanceCard({ expose }) {
  const feats = expose.features ?? [];
  const battery = feats.find((f) => (f.base ?? f.property) === "battery");
  const illuminance = feats.filter((f) => (f.base ?? f.property) === "illuminance");
  const readings = illuminance.length ? illuminance.map((f) => demoFeature(f)) : [320];
  return (
    <div className={heroClass(false)}>
      <div className={HERO_HEAD}>
        <span className={HERO_TITLE}>{epLabel(expose, "Illuminance")}</span>
      </div>
      <InfoRow label="Battery" value={battery ? demoFeature(battery) : 87} unit="%" icon={BoltIcon} />
      <div className="flex justify-center gap-3 py-2">
        {readings.map((v, i) => (
          <CircleStat key={i} label="Illuminance" value={`${v}lx`} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lookup

export const WIDGETS = {
  Toggle, Slider, Bar, StepperInput, NumberInput, Select, SegmentedControl,
  CommandButton, TextInput, TextRow, Badge, DurationInput, CompositeForm,
  ListEditor, RawJson, SensorTile, StateTile, AlarmTile, EnergyTile,
  BatteryPill, EventFeed, BrightnessSlider, ColorTempSlider, ColorWheel,
  EffectPicker, InfoRow, CircleStat, PillSegmented, MiniSwitch,
  LightCard, SwitchCard, CoverCard, LockCard, ClimateCard, AirConditionerCard, FanCard,
  AirQualityCard, GasDetectorCard, IlluminanceCard,
};
