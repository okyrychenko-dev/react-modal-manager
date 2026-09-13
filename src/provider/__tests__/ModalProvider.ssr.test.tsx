import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createModalRegistry } from "../../registry/createModalRegistry";
import { ModalProvider } from "../ModalProvider";
import { renameReportModal } from "./ModalProvider.fixtures";

describe("ModalProvider SSR", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render deterministic empty modal state across server requests", () => {
    const firstRegistry = createModalRegistry({
      renameReport: renameReportModal,
    });
    const secondRegistry = createModalRegistry({
      renameReport: renameReportModal,
    });

    const renderRequest = (
      registry: ReturnType<typeof createModalRegistry>,
    ): string =>
      renderToString(
        <ModalProvider registry={registry}>
          <span>Application content</span>
        </ModalProvider>,
      );

    const firstMarkup = renderRequest(firstRegistry);
    const secondMarkup = renderRequest(secondRegistry);

    expect(firstMarkup).toBe("<span>Application content</span>");
    expect(secondMarkup).toBe(firstMarkup);
    expect(firstRegistry.isReady()).toBe(false);
    expect(secondRegistry.isReady()).toBe(false);
  });

  it("should hydrate from matching state before binding the registry", async () => {
    const registry = createModalRegistry({ renameReport: renameReportModal });
    const application = (
      <ModalProvider registry={registry}>
        <span>Application content</span>
      </ModalProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(application);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(registry.isReady()).toBe(false);

    const root = hydrateRoot(container, application);

    expect(registry.isReady()).toBe(false);

    await act(async () => undefined);

    expect(container).toHaveTextContent("Application content");
    expect(consoleError).not.toHaveBeenCalled();
    expect(registry.isReady()).toBe(true);

    root.unmount();
    expect(registry.isReady()).toBe(false);
  });
});
