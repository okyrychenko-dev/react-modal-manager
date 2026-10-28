// @vitest-environment node

import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createModalRegistry } from "../../registry";
import { ModalProvider } from "../ModalProvider";

describe("ModalProvider without browser globals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render on the server without warnings or binding the registry", () => {
    const registry = createModalRegistry({});
    const consoleError = vi.spyOn(console, "error");
    const consoleWarn = vi.spyOn(console, "warn");

    const markup = renderToString(
      <ModalProvider registry={registry}>
        <span>Server content</span>
      </ModalProvider>,
    );

    expect(markup).toBe("<span>Server content</span>");
    expect(registry.isReady()).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
