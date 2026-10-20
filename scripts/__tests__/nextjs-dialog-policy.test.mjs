import { expect } from "playwright/test";
import { expectDialogOutcome } from "./nextjs-dialog-focus.test.mjs";

/**
 * @param {import("playwright").Page} page
 * @returns {Promise<void>}
 */
export async function verifyConfirmationPolicy(page) {
  const open = page.getByRole("button", {
    name: "Open confirmation",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Delete report?" });
  await page.getByLabel("Dismissal policy").selectOption("disabled");

  await open.click();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

  await expectDialogOutcome(page, "Cancelled: cancel", open);

  for (const policy of ["default", "enabled", "disabled"]) {
    await page.getByLabel("Dismissal policy").selectOption(policy);
    await open.click();
    await expect(dialog).toBeVisible();
    await page.locator(".overlay").click({ position: { x: 5, y: 5 } });

    if (policy === "disabled") {
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", { name: "Delete report", exact: true })
        .click();
      await expectDialogOutcome(page, "Confirmed", open);
      await open.click();
      await dialog
        .getByRole("button", { name: "Dismiss retained handle" })
        .click();
      await expectDialogOutcome(page, "Dismissed: dismiss", open);
    } else {
      await expectDialogOutcome(page, "Dismissed: dismiss", open);
      await open.click();
      await page.keyboard.press("Escape");
      await expectDialogOutcome(page, "Dismissed: dismiss", open);
    }
  }

  await page.getByLabel("Dismissal policy").selectOption("default");
  await page.getByLabel("Dangerous confirmation").check();
  await open.click();
  const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Enter");
  await expectDialogOutcome(page, "Cancelled: cancel", open);
  await open.click();
  await expect(cancel).toBeFocused();
  await dialog
    .getByRole("button", { name: "Delete report", exact: true })
    .click();
  await expectDialogOutcome(page, "Confirmed", open);
  await page.getByLabel("Dangerous confirmation").uncheck();
}
