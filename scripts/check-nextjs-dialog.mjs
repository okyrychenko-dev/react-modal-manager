import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  assertDefined,
  assertTrue,
  isObject,
  isOneOf,
} from "@okyrychenko-dev/type-utils";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "modal-nextjs-"));
const app = join(temporary, "app");
let server;
let browser;
let serverExit;
const failures = [];

function run(args, cwd = app) {
  execFileSync("pnpm", args, {
    cwd,
    stdio: "inherit",
    timeout: 240_000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
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

try {
  cpSync(join(root, "examples/nextjs-dialog"), app, {
    recursive: true,
    filter: (path) =>
      !isOneOf(basename(path), [
        "node_modules",
        ".next",
        "react-modal-manager.tgz",
      ]),
  });
  run(["run", "build"], root);
  run(["pack", "--out", join(app, "react-modal-manager.tgz")], root);
  // Only the artifact under test changes; preserve every external lockfile entry.
  const lockPath = join(app, "pnpm-lock.yaml");
  const lock = readFileSync(lockPath, "utf8");
  const checksum = createHash("sha512")
    .update(readFileSync(join(app, "react-modal-manager.tgz")))
    .digest("base64");
  const artifactResolution =
    /integrity: sha512-[A-Za-z0-9+/=]+(?=,\s+tarball: file:react-modal-manager\.tgz)/gu;
  assertTrue(
    [...lock.matchAll(artifactResolution)].length === 1,
    "Expected exactly one local artifact in fixture lockfile",
  );
  writeFileSync(
    lockPath,
    lock.replace(artifactResolution, `integrity: sha512-${checksum}`),
  );
  run(["install", "--frozen-lockfile"]);
  run(["run", "typecheck"]);
  run(["run", "build"]);
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
  assertTrue(html.includes("Report workspace"), "Server route did not render");
  assertTrue(
    !html.includes('role="dialog"'),
    "Dialog opened during server rendering",
  );
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
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
  const outcome = page.getByRole("status");
  async function expectOutcome(text) {
    await page.getByRole("status").filter({ hasText: text }).waitFor();
    assertTrue(
      (await outcome.innerText()) === text,
      `Wrong outcome: expected ${text}`,
    );
    await dialog.waitFor({ state: "hidden" });
  }
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
  await expectOutcome("Confirmed");
  await open.focus();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectOutcome("Cancelled: cancel");
  assertTrue(
    await open.evaluate((element) => element === document.activeElement),
    "Opener focus not restored",
  );
  await open.click();
  await page.keyboard.press("Escape");
  await expectOutcome("Dismissed: dismiss");
  await open.click();
  await dialog.getByRole("button", { name: "Dismiss retained handle" }).click();
  await expectOutcome("Dismissed: dismiss");
  await open.click();
  await dialog.getByRole("button", { name: "Unmount launcher" }).click();
  await expectOutcome("Dismissed: dismiss");
  await page.getByRole("button", { name: "Mount launcher" }).waitFor();
  assertTrue(
    await page
      .locator("#workspace-focus")
      .evaluate((element) => element === document.activeElement),
    "Removed opener did not fall back to workspace focus",
  );
  await page.getByRole("button", { name: "Mount launcher" }).click();
  await open.click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expectOutcome("Cancelled: cancel");
  await page.close();
  assertTrue(failures.length === 0, failures.join("\n"));
  const manifest = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
  console.log("Packed Next.js / Radix smoke passed", {
    node: process.version,
    ...manifest.dependencies,
  });
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
      rmSync(temporary, { recursive: true, force: true });
    }
  }
}
