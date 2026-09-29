import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ["bs-local.com"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
