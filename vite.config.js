import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// data/ doubles as the static dir: /index.json, /categories.json, /devices/<model>.json
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "data",
});
