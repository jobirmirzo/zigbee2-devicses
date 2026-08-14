// Slide-over panel: fetches the full device JSON and renders every expose
// through registry.layout() -> WIDGETS. Interactive with demo state.

import { useEffect, useState } from "react";
import { layout, ROLE_ORDER } from "../registry.js";
import { demoValue } from "../demo.js";
import { WIDGETS, FeatureControl } from "./widgets.jsx";

const SECTION_TITLES = {
  alert: "Alerts",
  primary: "Controls",
  control: "Controls",
  sensor: "Readings",
  event: "Events",
  config: "Settings",
  diagnostic: "Diagnostics",
};

// sections that start collapsed
const COLLAPSED = new Set(["config", "diagnostic"]);

export default function DeviceDetail({ device, onClose }) {
  const [full, setFull] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setFull(null);
    setError(null);
    fetch(`/devices/${device.file}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setFull)
      .catch((e) => setError(String(e)));
  }, [device.file]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-20 bg-[rgba(8,10,15,0.6)]" onClick={onClose} />
      <aside
        className="fixed top-0 right-0 bottom-0 z-[21] w-[min(560px,100vw)] overflow-y-auto border-l border-[var(--border)] bg-[var(--bg)] animate-[slide-in_0.22s_ease-out] motion-reduce:animate-none"
        role="dialog"
        aria-label={`${device.vendor} ${device.model}`}
      >
        <header className="sticky top-0 z-[2] flex items-start gap-[14px] border-b border-[var(--border)] bg-[var(--surface)] px-5 pt-5 pb-4">
          <div className="flex-1">
            <span className="text-[0.72rem] tracking-[0.06em] text-[var(--honey)] uppercase">{device.vendor}</span>
            <h2 className="mt-[2px] mb-1 font-mono text-[1.25rem]">{device.model}</h2>
            <p className="m-0 text-[0.85rem] text-[var(--muted)]">{device.description}</p>
          </div>
          {device.image && (
            <img className="h-[72px] w-[72px] rounded-lg bg-white object-contain" src={device.image} alt="" />
          )}
          <button
            className="h-8 w-8 shrink-0 rounded-lg border-0 bg-[var(--raised)] text-[var(--muted)] hover:text-[var(--text)]"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        {error && <p className="px-5 py-6 text-[var(--danger)]">Couldn't load device file: {error}</p>}
        {!full && !error && <p className="px-5 py-6 text-[var(--muted)]">Loading…</p>}
        {full && <ExposeSections device={full} />}
      </aside>
    </>
  );
}

function ExposeSections({ device }) {
  const { header, sections } = layout(device);
  const [values, setValues] = useState(() => {
    const init = {};
    for (const list of Object.values(sections))
      for (const { expose } of list) init[keyOf(expose)] = demoValue(expose);
    for (const { expose } of header) init[keyOf(expose)] = demoValue(expose);
    return init;
  });
  const setter = (k) => (v) => setValues((s) => ({ ...s, [k]: v }));

  // endpoint-heavy devices repeat the same grouped expose; keep them together
  return (
    <div className="flex flex-col gap-[18px] px-5 pt-4 pb-10">
      {header.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {header.map((item, i) => (
            <Widget key={i} item={item} value={values[keyOf(item.expose)]} onChange={setter(keyOf(item.expose))} />
          ))}
        </div>
      )}
      {ROLE_ORDER.map((role) => {
        const items = sections[role];
        if (!items?.length) return null;
        const tiles = role === "sensor" || role === "alert";
        const body = (
          <div
            className={
              tiles
                ? "grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2"
                : "flex flex-col gap-1"
            }
          >
            {items.map((item, i) => (
              <Widget key={i} item={item} value={values[keyOf(item.expose)]} onChange={setter(keyOf(item.expose))} />
            ))}
          </div>
        );
        if (COLLAPSED.has(role))
          return (
            <details key={role}>
              <summary className="mb-[10px] cursor-pointer text-[0.75rem] tracking-[0.09em] text-[var(--muted)] uppercase select-none">
                {SECTION_TITLES[role]} <span className="font-mono ml-1.5 opacity-70">{items.length}</span>
              </summary>
              {body}
            </details>
          );
        return (
          <section key={role}>
            <h3 className="m-0 mb-[10px] text-[0.75rem] tracking-[0.09em] text-[var(--muted)] uppercase">
              {SECTION_TITLES[role]}
            </h3>
            {body}
          </section>
        );
      })}
    </div>
  );
}

const keyOf = (e) => `${e.property ?? e.name ?? e.type}@${e.endpoint ?? ""}`;

function Widget({ item, value, onChange }) {
  const C = WIDGETS[item.component];
  if (!C) return <FeatureControl feature={item.expose} value={value} onChange={onChange} />;
  return (
    <C expose={item.expose} label={item.label ?? ""} opts={item.opts} value={value} onChange={onChange} />
  );
}
