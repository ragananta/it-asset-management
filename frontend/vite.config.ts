import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: "dist/stats.html", gzipSize: true }) as any,
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react-dom")) return "vendor-react-dom";
          if (id.includes("node_modules/react")) return "vendor-react";
          if (id.includes("node_modules/react-router")) return "vendor-router";
          if (id.includes("node_modules/axios")) return "vendor-axios";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
        },
      },
    },
  },
});
