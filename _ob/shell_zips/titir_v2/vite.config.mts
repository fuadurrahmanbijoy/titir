import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Shell renderer only. Plugins are never built by TiTir's own build (§6).
export default defineConfig({
  root: "src/renderer",
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true
  }
});
