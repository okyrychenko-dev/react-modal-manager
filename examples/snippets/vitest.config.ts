import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@radix-ui/react-dialog",
      "@okyrychenko-dev/react-modal-manager",
    ],
  },
  test: {
    include: ["__tests__/*.test.{ts,tsx}"],
    environment: "happy-dom",
    globals: true,
  },
});
