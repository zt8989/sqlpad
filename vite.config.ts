import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "./" : "/",
  server: {
    port: process.env.PORT || 3000,
  },
  plugins: [
    react(),
    VitePWA({ registerType: 'autoUpdate', devOptions: {
      enabled: process.env.NODE_ENV !== "production"
    } })
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
});
