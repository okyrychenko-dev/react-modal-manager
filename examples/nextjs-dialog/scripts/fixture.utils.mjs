import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertTrue,
  isFunction,
  isObject,
  isOneOf,
} from "@okyrychenko-dev/type-utils";
import { configurePackedModalPackage } from "./packed-package.utils.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

export function runPnpm(args, cwd) {
  execFileSync("pnpm", args, {
    cwd,
    stdio: "inherit",
    timeout: 240_000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}

export function createNextjsFixture({ published = false } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), "modal-nextjs-"));
  const app = join(temporary, "app");
  const dispose = () => rmSync(temporary, { recursive: true, force: true });

  try {
    cpSync(join(root, "examples/nextjs-dialog"), app, {
      recursive: true,
      filter: (path) =>
        !isOneOf(basename(path), [
          "node_modules",
          ".next",
          "coverage",
          "react-modal-manager.tgz",
        ]) && !path.endsWith(".tsbuildinfo"),
    });
    if (!published) {
      runPnpm(["run", "build"], root);
      runPnpm(["pack", "--out", join(app, "react-modal-manager.tgz")], root);
      configurePackedModalPackage(app, root);
    }
    runPnpm(["install", "--frozen-lockfile"], app);
    const loadPackage = createRequire(join(app, "package.json"));
    const library = loadPackage("@okyrychenko-dev/react-modal-manager");
    assertTrue(
      isObject(library) && isFunction(library.useOwnedModalHandles),
      "The pinned package does not export useOwnedModalHandles. Use the packed commands; update the npm pin after a compatible release is published.",
    );
    return { app, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
