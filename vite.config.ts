import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

const localAssetDirectory = fileURLToPath(
  new URL("./src/game/assets/files", import.meta.url),
);

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [localAssetDirectory],
    },
    proxy: {
      "/assets/files": {
        target: "http://127.0.0.1:5173",
        rewrite: (path) => `/@fs${localAssetDirectory}${path.replace(/^\/assets\/files/, "")}`,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
