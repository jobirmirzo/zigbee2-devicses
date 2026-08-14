// Gallery card: identity + category, enough to eyeball the classification.

const CATEGORY_ICONS = {
  light: "💡", switch: "🔌", cover: "🪟", lock: "🔒", climate: "🌡️",
  fan: "🌀", safety: "🚨", motion: "🏃", contact: "🚪", air_quality: "🍃",
  env_sensor: "🌡️", energy: "⚡", remote: "🎛️", other: "📦",
};

export default function DeviceCard({ device, categories, onOpen }) {
  const cat = categories?.[device.category];
  return (
    <button
      className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-0 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--honey)]"
      onClick={() => onOpen(device)}
    >
      <div className="grid h-[110px] place-items-center bg-white">
        {device.image ? (
          <img
            className="max-h-24 max-w-[80%] object-contain"
            src={device.image}
            alt=""
            loading="lazy"
            onError={(e) => (e.target.style.display = "none")}
          />
        ) : (
          <span className="text-[2rem]">{CATEGORY_ICONS[device.category] ?? "📦"}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-3 pt-[10px] pb-3">
        <span className="text-[0.72rem] tracking-[0.06em] text-[var(--honey)] uppercase">
          {device.vendor ?? "Unknown"}
        </span>
        <span className="font-mono text-[0.92rem] font-medium">{device.model}</span>
        <span className="line-clamp-2 flex-1 text-[0.78rem] text-[var(--muted)]">{device.description}</span>
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-full bg-[var(--raised)] px-2 py-0.5 text-[0.7rem] text-[var(--muted)]">
            {CATEGORY_ICONS[device.category]} {cat?.label ?? device.category}
            {device.subcategory ? ` · ${device.subcategory.replace(/_/g, " ")}` : ""}
          </span>
          <span className="font-mono text-[0.7rem] text-[var(--muted)]">{device.exposeCount}</span>
        </div>
      </div>
    </button>
  );
}

export { CATEGORY_ICONS };
