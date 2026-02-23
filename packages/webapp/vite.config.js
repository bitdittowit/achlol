import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    envDir: path.resolve(__dirname, "../.."),
    server: {
        port: 5173,
        allowedHosts: true,
    },
});
