import { once } from "node:events";
import { createServer } from "node:http";
import { basename } from "node:path";
import { assertDefined, assertTrue } from "@okyrychenko-dev/type-utils";
import { build } from "esbuild";
import { chromium } from "playwright";
import { expect } from "playwright/test";

const { outputFiles } = await build({
  entryPoints: ["examples/snippets/browser/main.tsx"],
  bundle: true,
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  outdir: "/portable-browser",
  write: false,
});
const assets = new Map(
  outputFiles.map((file) => [`/${basename(file.path)}`, file.text]),
);
const html =
  '<!doctype html><html><head><link rel="icon" href="data:,"><link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script src="/main.js"></script></body></html>';
const server = createServer((request, response) => {
  const asset = assets.get(request.url);
  let contentType = "text/html";
  if (request.url === "/main.js") {
    contentType = "text/javascript";
  }
  if (request.url === "/main.css") {
    contentType = "text/css";
  }
  response.setHeader("Content-Type", contentType);
  response.end(asset ?? html);
});
let browser;
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assertDefined(address);
  assertTrue(typeof address !== "string");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  const open = page.getByRole("button", { name: "Open decision", exact: true });
  const dialog = page.getByRole("dialog", { name: "Decision", exact: true });
  const outcome = page.getByTestId("outcome");
  for (const policy of ["default", "enabled", "disabled"]) {
    await page.getByLabel("Policy").selectOption(policy);
    for (const action of ["Escape", "outside", "Cancel", "Confirm", "owner"]) {
      await open.click();
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Confirm", exact: true }),
      ).toBeFocused();
      if (action === "Escape") {
        await page.keyboard.press("Escape");
      } else if (action === "outside") {
        await page
          .locator(".portable-overlay")
          .click({ position: { x: 5, y: 5 } });
      } else if (action === "owner") {
        await dialog.getByRole("button", { name: "Dismiss owner" }).click();
      } else {
        await dialog.getByRole("button", { name: action, exact: true }).click();
      }
      let expected = "dismiss";
      if (action === "Cancel") {
        expected = "cancel";
      }
      if (action === "Confirm") {
        expected = "Confirmed";
      }
      if (action === "owner") {
        expected = "Rejected: dismiss";
      }
      if (
        policy === "disabled" &&
        (action === "Escape" || action === "outside")
      ) {
        await expect(dialog).toBeVisible();
        await dialog
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
        expected = "cancel";
      }
      await expect(dialog).toBeHidden();
      await expect(outcome).toHaveText(expected);
      await expect(open).toBeFocused();
    }
  }
  await page.getByLabel("Policy").selectOption("default");
  await open.click();
  await dialog.getByRole("button", { name: "Open neighbor" }).click();
  const neighbor = page.getByRole("dialog", { name: "Neighbor", exact: true });
  await expect(neighbor).toBeVisible();
  await expect(
    neighbor.getByRole("button", { name: "Confirm", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(neighbor).toBeHidden();
  await expect(page.getByTestId("neighbor-outcome")).toHaveText("dismiss");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(outcome).toHaveText("Confirmed");
  assertTrue(failures.length === 0, failures.join("\n"));
  console.log("Production portable React / Radix Chromium smoke passed");
} finally {
  await browser?.close();
  server.close();
  await once(server, "close");
}
