import { useState } from "react";
import App from "./App.jsx";
import WidgetGallery from "./pages/WidgetGallery.jsx";

const VIEWS = { catalog: App, gallery: WidgetGallery };

export default function Root() {
  const [view, setView] = useState("gallery");
  const View = VIEWS[view];
  return (
    <div>
      <div className="fixed right-4 top-4 z-50 flex gap-1 rounded-full border border-slate-700 bg-slate-900/90 p-1 shadow-lg backdrop-blur">
        {Object.keys(VIEWS).map((key) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
              view === key ? "bg-slate-100 text-slate-900" : "text-slate-300 hover:text-white"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <View />
    </div>
  );
}
