import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      exclude: ["src/**/*.fixtures.{ts,tsx}"],
    },
  },
});
