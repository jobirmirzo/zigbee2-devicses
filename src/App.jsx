import { useEffect, useMemo, useRef, useState } from "react";
import DeviceCard, { CATEGORY_ICONS } from "./components/DeviceCard.jsx";
import DeviceDetail from "./components/DeviceDetail.jsx";

const PAGE = 48;

export default function App() {
  const [index, setIndex] = useState(null);
  const [categories, setCategories] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const sentinel = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch("/index.json").then((r) => r.json()),
      fetch("/categories.json").then((r) => r.json()),
    ]).then(([idx, cats]) => {
      setIndex(idx.filter((d) => d.category !== "alias"));
      setCategories(cats);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    return index.filter(
      (d) =>
        (filter === "all" || d.category === filter) &&
        (!q ||
          `${d.vendor} ${d.model} ${d.description}`.toLowerCase().includes(q) ||
          d.capabilities?.some((c) => c.includes(q)))
    );
  }, [index, filter, query]);

  useEffect(() => setVisible(PAGE), [filter, query]);

  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible((v) => v + PAGE),
      { rootMargin: "800px" }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [index]);

  if (!index || !categories)
    return (
      <div className="grid h-full place-items-center font-mono text-[var(--muted)]">
        loading 5,120 devices…
      </div>
    );

  const catEntries = Object.entries(categories).filter(
    ([k, v]) => k !== "alias" && v.total > 0
  );

  const navBtn = (active) =>
    `flex items-center justify-between gap-1.5 rounded-lg border-0 bg-transparent px-[10px] py-[7px] text-left text-[0.9rem] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] max-[760px]:whitespace-nowrap ${
      active ? "bg-[var(--honey-dim)] font-semibold text-[var(--honey)] hover:bg-[var(--honey-dim)] hover:text-[var(--honey)]" : ""
    }`;

  return (
    <div className="flex h-full max-[760px]:flex-col">
      <aside className="flex w-[250px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] max-[760px]:w-full max-[760px]:flex-row max-[760px]:overflow-x-auto max-[760px]:border-b max-[760px]:border-r-0 max-[760px]:border-[var(--border)]">
        <div className="flex items-center gap-[10px] border-b border-[var(--border)] px-4 pt-[18px] pb-[14px] max-[760px]:shrink-0 max-[760px]:border-b-0">
          <svg className="h-[30px] w-[30px] shrink-0 text-[var(--honey)]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <div>
            <h1 className="m-0 text-[1.15rem] tracking-[0.02em]">Hive</h1>
            <span className="text-[0.72rem] text-[var(--muted)]">Zigbee device explorer</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2 max-[760px]:flex-row" aria-label="Categories">
          <button className={navBtn(filter === "all")} onClick={() => setFilter("all")}>
            <span>All devices</span>
            <span className="font-mono text-[0.72rem] opacity-75">{index.length}</span>
          </button>
          {catEntries
            .sort((a, b) => b[1].total - a[1].total)
            .map(([key, cat]) => (
              <button key={key} className={navBtn(filter === key)} onClick={() => setFilter(key)}>
                <span>
                  {CATEGORY_ICONS[key]} {cat.label}
                </span>
                <span className="font-mono text-[0.72rem] opacity-75">{cat.total}</span>
              </button>
            ))}
        </nav>

        <footer className="border-t border-[var(--border)] px-4 py-3 text-[0.7rem] text-[var(--muted)] max-[760px]:hidden">
          <span className="font-mono">zigbee2mqtt docs · {index.length} devices</span>
        </footer>
      </aside>

      <main className="flex-1 overflow-y-auto px-[22px] pb-10 max-[760px]:px-3 max-[760px]:pb-6">
        <div className="sticky top-0 z-[5] flex items-center gap-[14px] bg-[linear-gradient(var(--bg)_80%,transparent)] pt-[14px] pb-3">
          <input
            type="search"
            placeholder="Search vendor, model, capability…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search devices"
            className="flex-1 max-w-[460px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[14px] py-[9px] text-[var(--text)] placeholder:text-[var(--muted)]"
          />
          <span className="font-mono text-[0.78rem] text-[var(--muted)]">
            {filtered.length} {filter !== "all" ? categories[filter]?.label.toLowerCase() : "devices"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-[var(--muted)]">
            <p>No devices match "{query}".</p>
            <button
              className="rounded-lg border border-[var(--honey)] bg-transparent px-[14px] py-[6px] text-[0.85rem] text-[var(--honey)] hover:bg-[var(--honey-dim)]"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
            {filtered.slice(0, visible).map((d) => (
              <DeviceCard key={d.file} device={d} categories={categories} onOpen={setSelected} />
            ))}
          </div>
        )}
        <div ref={sentinel} className="h-px" />
      </main>

      {selected && <DeviceDetail device={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
