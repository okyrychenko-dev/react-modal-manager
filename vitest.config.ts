import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      exclude: ["src/**/__tests__/**", "src/**/*.fixtures.{ts,tsx}"],
      thresholds: {
        branches: 95,
        functions: 100,
        lines: 99,
        statements: 99,
      },
    },
  },
});
