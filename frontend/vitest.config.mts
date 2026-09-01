import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // next.config.ts turns the React Compiler on, so the tests run through it
  // too. Without this they would exercise un-memoised components while
  // production ships compiled ones — and YearsInput adjusts state during
  // render, which the compiler treats specially.
  plugins: [react({ compiler: true })],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // The template loader resolves ../templates from the working directory,
    // so tests must run from this package root, as the app does.
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
});
