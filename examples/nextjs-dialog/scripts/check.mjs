import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  assertDefined,
  assertTrue,
  isObject,
  isOneOf,
} from "@okyrychenko-dev/type-utils";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { verifyConfirmationPolicy } from "../tests/browser/confirmation-policy.mjs";
import {
  verifyCustomerCancellation,
  verifyCustomerFlow,
  verifyDelayedCustomerFlow,
} from "../tests/browser/customer-flow.mjs";
import {
  expectDialogOutcome,
  verifyUnavailableOpenerFallback,
} from "../tests/browser/focus.mjs";
import { verifyRenderRecovery } from "../tests/browser/render-recovery.mjs";
import { createNextjsFixture, runPnpm } from "./fixture.utils.mjs";

const published = process.argv.includes("--published");
const serve = process.argv.includes("--serve");
const unitOnly = process.argv.includes("--unit-only");
const lintOnly = process.argv.includes("--lint-only");
assertTrue(
  [serve, unitOnly, lintOnly].filter(Boolean).length <= 1,
  "Choose one verification mode",
);
const fixture = createNextjsFixture({ published });
const { app } = fixture;
let server;
let browser;
let serverExit;
const failures = [];

function lintExample() {
  const eslint = fileURLToPath(
    new URL("../../../node_modules/.bin/eslint", import.meta.url),
  );
  const config = fileURLToPath(
    new URL("../eslint.config.mjs", import.meta.url),
  );
  execFileSync(
    eslint,
    ["--config", config, "app", "tests", "scripts", "--ext", ".ts,.tsx,.mjs"],
    {
      cwd: app,
      stdio: "inherit",
      timeout: 240_000,
    },
  );
}

async function availablePort() {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assertTrue(isObject(address), "No test port");
  const { port } = address;
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function ready(url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    assertTrue(
      server.exitCode === null && server.signalCode === null,
      "Next server exited before readiness",
    );
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      /* Retry until the production server accepts connections. */
    }
    await setTimeout(100);
  }
  throw new Error("Next server readiness timed out");
}

async function verifyBrowser(url) {
  browser = await chromium.launch();
  const page = await browser.newPage();
  let expectedRenderErrors = 0;
  let verifyingRecovery = false;
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (isOneOf(message.type(), ["error", "warning"])) {
      if (
        message.type() === "error" &&
        verifyingRecovery &&
        message.text().split("\n")[0] ===
          "Error: Intentional customer render failure (recovery demo)" &&
        expectedRenderErrors < 2
      ) {
        expectedRenderErrors += 1;
        return;
      }
      failures.push(`Browser ${message.type()}: ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (event) =>
      console.error("Unhandled rejection", event.reason),
    );
  });
  await page.goto(url);
  const open = page.getByRole("button", {
    name: "Open confirmation",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Delete report?" });
  await open.click();
  await dialog.waitFor();
  assertTrue(
    (await page.getByRole("dialog").count()) === 1,
    "Nested or duplicated dialog semantics",
  );
  assertDefined(
    await dialog.getAttribute("aria-describedby"),
    "Missing description",
  );
  assertTrue(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Focus did not enter dialog",
  );
  await expect(
    dialog.getByRole("button", { name: "Delete report", exact: true }),
  ).toBeFocused();
  // Radix must prevent keyboard focus and pointer access to the background.
  await page.keyboard.press("Shift+Tab");
  assertTrue(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Focus escaped the dialog",
  );
  assertTrue(
    await page
      .locator("body")
      .evaluate(
        (element) => getComputedStyle(element).pointerEvents === "none",
      ),
    "Background pointer access is not blocked",
  );
  await dialog
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  await expectDialogOutcome(page, "Confirmed", open);
  await open.focus();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectDialogOutcome(page, "Cancelled: cancel", open);
  await open.click();
  await page.keyboard.press("Escape");
  await expectDialogOutcome(page, "Dismissed: dismiss", open);
  await open.click();
  await dialog.getByRole("button", { name: "Dismiss retained handle" }).click();
  await expectDialogOutcome(page, "Dismissed: dismiss", open);
  await open.click();
  await dialog.getByRole("button", { name: "Unmount launcher" }).click();
  await expectDialogOutcome(
    page,
    "Dismissed: dismiss",
    page.locator("#workspace-focus"),
  );
  await page.getByRole("button", { name: "Mount launcher" }).waitFor();
  await page.getByRole("button", { name: "Mount launcher" }).click();
  await open.click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectDialogOutcome(page, "Cancelled: cancel", open);
  await verifyConfirmationPolicy(page);
  await verifyUnavailableOpenerFallback(page);
  await verifyCustomerFlow(page);
  await verifyCustomerCancellation(page);
  await verifyDelayedCustomerFlow(page);
  verifyingRecovery = true;
  await verifyRenderRecovery(page);
  verifyingRecovery = false;
  assertTrue(
    expectedRenderErrors === 2,
    "Expected exactly two intentional render-error reports",
  );
  await page.close();
  assertTrue(failures.length === 0, failures.join("\n"));
  const manifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
  const source = published ? "Published" : "Packed";
  console.log(`${source} Next.js / Radix smoke passed`, {
    node: process.version,
    ...manifest.dependencies,
  });
}

async function main() {
  try {
    if (lintOnly) {
      lintExample();
      return;
    }
    if (!serve) {
      runPnpm(["run", "check"], app);
      if (unitOnly) {
        return;
      }
      lintExample();
    } else {
      runPnpm(["run", "typecheck"], app);
    }
    runPnpm(["run", "build"], app);
    const port = await availablePort();
    const url = `http://127.0.0.1:${port}`;
    // Launch Next directly so termination owns the server, not a package-manager wrapper.
    server = spawn(
      process.execPath,
      [
        join(app, "node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: app,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      },
    );
    serverExit = once(server, "exit");
    server.stdout.on("data", (data) => process.stdout.write(data));
    server.stderr.on("data", (data) => {
      failures.push(`Server stderr: ${data}`);
      process.stderr.write(data);
    });
    const html = await ready(url);
    assertTrue(
      html.includes("Report workspace"),
      "Server route did not render",
    );
    assertTrue(
      !html.includes('role="dialog"'),
      "Dialog opened during server rendering",
    );
    if (serve) {
      const signals = new AbortController();
      try {
        console.log(
          `Packed Next.js example ready at ${url}. Press Ctrl+C to stop and remove the temporary copy.`,
        );
        await Promise.race([
          serverExit,
          once(process, "SIGINT", { signal: signals.signal }),
          once(process, "SIGTERM", { signal: signals.signal }),
        ]);
      } finally {
        signals.abort();
      }
    } else {
      await verifyBrowser(url);
    }
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        if (server && server.exitCode === null && server.signalCode === null) {
          server.kill("SIGTERM");
          const force = globalThis.setTimeout(
            () => server.kill("SIGKILL"),
            5_000,
          );
          try {
            await serverExit;
          } finally {
            globalThis.clearTimeout(force);
          }
        }
      } finally {
        fixture.dispose();
      }
    }
  }
}

await main();
