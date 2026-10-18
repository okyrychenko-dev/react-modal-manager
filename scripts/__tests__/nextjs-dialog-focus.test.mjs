import { assertDefined, assertTrue } from "@okyrychenko-dev/type-utils";
import { expect } from "playwright/test";

/**
 * @param {import("playwright").Page} page
 * @returns {Promise<void>}
 */
export async function verifyUnavailableOpenerFallback(page) {
  const open = page.getByRole("button", {
    name: "Open confirmation",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Delete report?" });
  const fallback = page.locator("#workspace-focus");

  for (const [attribute, value] of [
    ["disabled", ""],
    ["hidden", ""],
    ["inert", ""],
    ["aria-hidden", "true"],
    ["style", "display: none"],
    ["style", "visibility: hidden"],
  ]) {
    const opener = await open.elementHandle();
    assertDefined(opener);
    await open.focus();
    await page.keyboard.press("Enter");
    await dialog.waitFor();

    try {
      await opener.evaluate(
        (element, [name, content]) => element.setAttribute(name, content),
        [attribute, value],
      );
      assertTrue(
        await opener.evaluate((element) => element.isConnected),
        "The unavailable opener must remain connected",
      );
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await expect(
        fallback,
        `Workspace fallback was not focused for ${attribute}="${value}"`,
      ).toBeFocused();
      await expect(page.getByRole("status")).toHaveText("Cancelled: cancel");
    } finally {
      await opener.evaluate(
        (element, name) => element.removeAttribute(name),
        attribute,
      );
      await opener.dispose();
    }
  }
}
