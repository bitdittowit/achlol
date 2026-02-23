import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    envDir: path.resolve(__dirname, "../.."), // один .env в корне монорепо
    server: {
        port: 5173,
        allowedHosts: true, // для localtunnel / cloudflared и других туннелей
        proxy: {
          // В режиме dev с одним туннелем на 5173 запросы к /api идут на тот же хост и проксируются на бэкенд
          "/api": { target: "http://localhost:3000", changeOrigin: false },
        },
      },
});
