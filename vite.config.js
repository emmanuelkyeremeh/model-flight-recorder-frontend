import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      /* The receipt contract the optional backend validates against too. It is
         aliased rather than imported by relative path so the copy in this repo
         and the copy in the backend repo stay recognisably the same file. */
      "@shared": path.resolve(import.meta.dirname, "./src/shared"),
    },
  },
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/canvasStub.js"],
  },
});
