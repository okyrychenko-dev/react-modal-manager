import { expect } from "playwright/test";

export async function verifyCustomerFlow(page) {
  await page
    .getByRole("button", { name: "Start customer flow", exact: true })
    .click();
  await page.getByRole("button", { name: "Select Ada Lovelace" }).click();
  await page.getByLabel("Customer name").fill("Ada Byron");
  await page.getByRole("button", { name: "Review changes" }).click();
  await expect(
    page.getByRole("dialog", { name: "Save Ada Byron?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await expect(page.getByTestId("flow-outcome")).toHaveText("Saved: Ada Byron");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#customer-flow-start")).toBeFocused();
}

export async function verifyCustomerCancellation(page) {
  const start = page.getByRole("button", {
    name: "Start customer flow",
    exact: true,
  });
  const outcome = page.getByTestId("flow-outcome");
  for (const step of ["selection", "editing", "confirmation"]) {
    for (const escape of [false, true]) {
      await start.click();
      if (step !== "selection") {
        await page.getByRole("button", { name: "Select Ada Lovelace" }).click();
      }
      if (step === "confirmation") {
        await expect(page.getByLabel("Customer name")).toHaveValue(
          "Ada Lovelace",
        );
        await page.getByRole("button", { name: "Review changes" }).click();
      }
      if (escape) {
        await page.keyboard.press("Escape");
      } else {
        let name = "Cancel";
        if (step === "selection") {
          name = "Cancel selection";
        }
        if (step === "editing") {
          name = "Cancel editing";
        }
        await page.getByRole("button", { name, exact: true }).click();
      }
      let expected = `Cancelled: ${step}`;
      if (escape) {
        expected = "Flow dismissed: dismiss";
      }
      await expect(outcome).toHaveText(expected);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(start).toBeFocused();
    }
  }
}

export async function verifyDelayedCustomerFlow(page) {
  await page.getByLabel("Show 600 ms exit visuals").check();
  await page
    .getByRole("button", { name: "Start customer flow", exact: true })
    .click();
  await page.getByRole("button", { name: "Select Grace Hopper" }).click();
  const editor = page.getByRole("dialog", { name: "Edit customer" });
  await expect(editor).toBeVisible();
  await expect(page.getByTestId("closing-visual")).toHaveCount(1);
  await expect(page.getByTestId("flow-outcome")).toHaveText(
    "Selection settled; editing customer",
  );
  await expect(page.getByLabel("Customer name")).toBeFocused();
  await expect(page.getByTestId("closing-visual")).toHaveCount(0);
  await expect(page.getByLabel("Customer name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(editor.locator(":focus")).toHaveCount(1);
  await page.getByRole("button", { name: "Review changes" }).click();
  await page.getByRole("button", { name: "Unmount flow launcher" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("closing-visual")).toHaveCount(0);
  await expect(page.locator("#workspace-focus")).toBeFocused();
  await page.getByRole("button", { name: "Mount flow launcher" }).click();
  await expect(page.getByTestId("flow-outcome")).toHaveText(
    "No customer saved",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await verifyCustomerFlow(page);
  await expect(page.getByTestId("closing-visual")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Show 600 ms exit visuals").uncheck();
}
