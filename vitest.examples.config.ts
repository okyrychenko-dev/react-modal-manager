import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@okyrychenko-dev/react-modal-manager": fileURLToPath(
        new URL("./src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["examples/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    globals: true,
  },
});
