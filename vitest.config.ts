import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@okyrychenko-dev/react-modal-manager": new URL(
        "./src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      exclude: ["src/**/__tests__/**", "src/**/*.fixtures.{ts,tsx}"],
      thresholds: {
        // The remaining gaps are initialization/cleanup guards with no supported
        // public trigger: a detached dialog, its guaranteed buttons being absent,
        // and repeated invocation of an internal registry unbind callback.
        branches: 95,
        functions: 100,
        lines: 99,
        statements: 99,
      },
    },
  },
});
