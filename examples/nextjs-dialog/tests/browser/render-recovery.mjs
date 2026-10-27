import { expect } from "playwright/test";

export async function verifyRenderRecovery(page) {
  // Mount an unrelated pending operation in the same Provider first.
  await page
    .getByRole("button", { name: "Open recovery neighbor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open failing dialog above this" })
    .click();
  const fallback = page.getByRole("dialog", {
    name: "Unable to render customer",
  });
  await expect(fallback).toBeVisible();
  await expect(page.getByTestId("recovery-outcome")).toHaveText(
    "Recovery pending",
  );
  await expect(page.getByTestId("recovery-settlements")).toHaveText(
    "Settlements: 0",
  );
  await expect(page.getByTestId("neighbor-outcome")).toHaveText(
    "Neighbor pending",
  );
  await fallback.getByRole("button", { name: "Dismiss failed dialog" }).click();
  await expect(fallback).toBeHidden();
  await expect(page.getByTestId("recovery-outcome")).toHaveText(
    "Recovered: dismiss",
  );
  await expect(page.getByTestId("recovery-settlements")).toHaveText(
    "Settlements: 1",
  );
  const unrelated = page.getByRole("dialog", { name: "Keep this operation" });
  await expect(unrelated).toBeVisible();
  await expect
    .poll(() =>
      unrelated.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      unrelated.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await unrelated
    .getByRole("button", { name: "Complete neighbor", exact: true })
    .click();
  await expect(page.getByTestId("neighbor-outcome")).toHaveText(
    "Neighbor confirmed",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open failing dialog", exact: true })
    .click();
  await expect(fallback).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("recovery-settlements")).toHaveText(
    "Settlements: 2",
  );
  await expect(page.getByTestId("recovery-outcome")).toHaveText(
    "Recovered: dismiss",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
