import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createModalRegistry, useModalManager } from "../../index";
import { ModalProvider } from "../ModalProvider";
import {
  CloseAllExample,
  ConfirmExample,
  DismissExample,
  ExternalDismissExample,
  NonDismissibleConfirmExample,
  NonStringTitleConfirmExample,
  OpenRenameModalExample,
  ProviderUnmountExample,
  RejectExample,
  SharedRegistryProviders,
  TestRenderer,
  customConfirmModal,
  renameReportModal,
} from "./ModalProvider.fixtures";
import type { ModalHandle } from "../../index";
import type { RenameReportResult } from "./ModalProvider.fixtures";

describe("ModalProvider", () => {
  afterEach(() => {
    delete document.body.dataset.closeAllCount;
    delete document.body.dataset.confirmed;
    delete document.body.dataset.dismissReason;
    delete document.body.dataset.externalDismissReason;
    delete document.body.dataset.externalInstanceId;
    delete document.body.dataset.providerOneResult;
    delete document.body.dataset.providerTwoResult;
    delete document.body.dataset.rejectMessage;
    delete document.body.dataset.rejectValue;
    delete document.body.dataset.result;
    delete document.body.dataset.unmountDismissReason;
    vi.useRealTimers();
  });

  it("should open a typed modal and resolve its result", async () => {
    render(
      <ModalProvider>
        <OpenRenameModalExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open rename" }));
    expect(
      screen.getByRole("dialog", { name: "Rename report" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(document.body.dataset.result).toBe("Revenue updated");
    });
    expect(
      screen.queryByRole("dialog", { name: "Rename report" }),
    ).not.toBeInTheDocument();
  });

  it("should resolve confirm modal results", async () => {
    render(
      <ModalProvider>
        <ConfirmExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(
      screen.getByRole("dialog", { name: "Delete report?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(document.body.dataset.confirmed).toBe("true");
    });
  });

  it("should hide the built-in confirm dismiss button when dismissible is false", () => {
    render(
      <ModalProvider>
        <NonDismissibleConfirmExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask locked" }));

    expect(
      screen.getByRole("dialog", { name: "Locked confirm?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
  });

  it("should give the built-in confirm an accessible name for a ReactNode title", () => {
    render(
      <ModalProvider>
        <NonStringTitleConfirmExample />
      </ModalProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ask with nested title" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Delete nested title?" }),
    ).toBeInTheDocument();
  });

  it("should use a custom confirm modal from provider props", async () => {
    render(
      <ModalProvider confirmModal={customConfirmModal}>
        <ConfirmExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      screen.getByRole("dialog", { name: "Custom confirm" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Custom cancel" }));

    await waitFor(() => {
      expect(document.body.dataset.confirmed).toBe("false");
    });
  });

  it("should reject dismissed modal promises with ModalDismissError", async () => {
    render(
      <ModalProvider>
        <DismissExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open dismissible" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(document.body.dataset.dismissReason).toBe("dismiss");
    });
  });

  it("should dismiss all active modals", async () => {
    render(
      <ModalProvider>
        <CloseAllExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open two" }));

    expect(
      screen.getAllByRole("dialog", { name: "Rename report" }),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Close all" }));

    await waitFor(() => {
      expect(document.body.dataset.closeAllCount).toBe("2");
    });

    expect(
      screen.queryByRole("dialog", { name: "Rename report" }),
    ).not.toBeInTheDocument();
  });

  it("should dismiss an active modal through its open handle", async () => {
    render(
      <ModalProvider>
        <ExternalDismissExample />
      </ModalProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open external dismiss" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Rename report" }),
    ).toBeInTheDocument();
    expect(document.body.dataset.externalInstanceId).toBe("modal-0");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss externally" }));

    await waitFor(() => {
      expect(document.body.dataset.externalDismissReason).toBe("dismiss");
    });

    expect(
      screen.queryByRole("dialog", { name: "Rename report" }),
    ).not.toBeInTheDocument();
  });

  it("should reject pending modal promises when the provider unmounts", async () => {
    const { unmount } = render(
      <ModalProvider>
        <ProviderUnmountExample />
      </ModalProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open before unmount" }),
    );

    unmount();

    await waitFor(() => {
      expect(document.body.dataset.unmountDismissReason).toBe(
        "provider-unmount",
      );
    });
  });

  it("should wrap non-error modal rejections with ModalRejectError", async () => {
    render(
      <ModalProvider>
        <RejectExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open string reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject string" }));

    await waitFor(() => {
      expect(document.body.dataset.rejectValue).toBe("failed");
    });
  });

  it("should preserve error modal rejections", async () => {
    render(
      <ModalProvider>
        <RejectExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open error reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject error" }));

    await waitFor(() => {
      expect(document.body.dataset.rejectMessage).toBe("Boom");
    });
  });

  it("should keep modal provider instances isolated", async () => {
    function ProviderOneExample() {
      const modal = useModalManager();

      const handleOpen = (): void => {
        void modal
          .open(renameReportModal, {
            currentName: "Provider one",
            reportId: "provider-one",
          })
          .then((result) => {
            if (result.status === "renamed") {
              document.body.dataset.providerOneResult = result.name;
            }
          })
          .catch(() => {
            document.body.dataset.providerOneResult = "dismissed";
          });
      };

      return (
        <button type="button" onClick={handleOpen}>
          Open provider one
        </button>
      );
    }

    function ProviderTwoExample() {
      const modal = useModalManager();

      const handleOpen = (): void => {
        void modal
          .open(renameReportModal, {
            currentName: "Provider two",
            reportId: "provider-two",
          })
          .then((result) => {
            if (result.status === "renamed") {
              document.body.dataset.providerTwoResult = result.name;
            }
          })
          .catch(() => {
            document.body.dataset.providerTwoResult = "dismissed";
          });
      };

      return (
        <button type="button" onClick={handleOpen}>
          Open provider two
        </button>
      );
    }

    render(
      <>
        <ModalProvider>
          <ProviderOneExample />
        </ModalProvider>
        <ModalProvider>
          <ProviderTwoExample />
        </ModalProvider>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open provider one" }));
    fireEvent.click(screen.getByRole("button", { name: "Open provider two" }));

    const modalShells = screen.getAllByRole("dialog", {
      name: "Rename report",
    });

    expect(modalShells).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]);

    await waitFor(() => {
      expect(document.body.dataset.providerOneResult).toBe(
        "Provider one updated",
      );
    });

    expect(document.body.dataset.providerTwoResult).toBeUndefined();
    expect(screen.getByText("Provider two")).toBeInTheDocument();
  });

  it("should keep an open handle bound to the provider that created it", async () => {
    let firstHandle: ModalHandle<RenameReportResult> | undefined;

    function OpenWithHandleExample({
      currentName,
      onOpen,
    }: {
      currentName: string;
      onOpen?: (handle: ModalHandle<RenameReportResult>) => void;
    }) {
      const modal = useModalManager();

      const handleOpen = (): void => {
        const handle = modal.open(renameReportModal, {
          currentName,
          reportId: currentName,
        });

        onOpen?.(handle);
        void handle.catch(() => undefined);
      };

      return (
        <button type="button" onClick={handleOpen}>
          Open {currentName}
        </button>
      );
    }

    render(
      <>
        <ModalProvider>
          <OpenWithHandleExample
            currentName="Provider one"
            onOpen={(handle) => {
              firstHandle = handle;
            }}
          />
        </ModalProvider>
        <ModalProvider>
          <OpenWithHandleExample currentName="Provider two" />
        </ModalProvider>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Provider one" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Provider two" }));

    expect(
      screen.getAllByRole("dialog", { name: "Rename report" }),
    ).toHaveLength(2);
    expect(firstHandle?.instanceId).toBe("modal-0");

    firstHandle?.dismiss();

    await waitFor(() => {
      expect(
        screen.getAllByRole("dialog", { name: "Rename report" }),
      ).toHaveLength(1);
    });

    expect(screen.getByText("Provider two")).toBeInTheDocument();
  });

  it("should render modals through a custom renderer", () => {
    render(
      <ModalProvider renderer={TestRenderer}>
        <OpenRenameModalExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open rename" }));

    expect(screen.getByTestId("modal-shell")).toHaveAttribute(
      "data-instance-id",
      "modal-0",
    );
    expect(screen.getByTestId("modal-shell").dataset.definitionId).toMatch(
      /^modal-definition-.+$/,
    );
  });

  it("should keep closing modals mounted until closeDelayMs elapses", async () => {
    vi.useFakeTimers();

    render(
      <ModalProvider closeDelayMs={200} renderer={TestRenderer}>
        <OpenRenameModalExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open rename" }));

    expect(screen.getByTestId("modal-shell")).toHaveAttribute(
      "data-status",
      "open",
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(screen.getByTestId("modal-shell")).toHaveAttribute(
      "data-status",
      "closing",
    );
    expect(
      screen.getByRole("dialog", { name: "Rename report" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(199);
    });

    expect(
      screen.getByRole("dialog", { name: "Rename report" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(
      screen.queryByRole("dialog", { name: "Rename report" }),
    ).not.toBeInTheDocument();
  });

  it("should clear scheduled modal removal timers when provider unmounts", () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <ModalProvider closeDelayMs={200} renderer={TestRenderer}>
        <OpenRenameModalExample />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open rename" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("should open typed modals through a provider-bound registry", async () => {
    const registry = createModalRegistry({
      renameReport: renameReportModal,
    });

    render(
      <ModalProvider registry={registry}>
        <div />
      </ModalProvider>,
    );

    expect(registry.isReady()).toBe(true);

    const resultPromise = registry.open("renameReport", {
      currentName: "Revenue",
      reportId: "report-1",
    });

    expect(
      await screen.findByRole("dialog", { name: "Rename report" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await expect(resultPromise).resolves.toEqual({
      name: "Revenue updated",
      status: "renamed",
    });
  });

  it("should return a dismissible open handle through a provider-bound registry", async () => {
    const registry = createModalRegistry({
      renameReport: renameReportModal,
    });

    render(
      <ModalProvider registry={registry}>
        <div />
      </ModalProvider>,
    );

    const handle = registry.open("renameReport", {
      currentName: "Revenue",
      reportId: "report-1",
    });

    expect(handle.instanceId).toBe("modal-0");

    handle.dismiss("close-all");

    await expect(handle).rejects.toMatchObject({
      reason: "close-all",
    });
  });

  it("should reject registry calls before it is bound to a provider", () => {
    const registry = createModalRegistry({ renameReport: renameReportModal });

    expect(() => {
      void registry.open("renameReport", {
        currentName: "Revenue",
        reportId: "report-1",
      });
    }).toThrow("Modal registry is not bound to a mounted ModalProvider");
  });

  it("should unbind a registry when its provider unmounts", async () => {
    const registry = createModalRegistry({ renameReport: renameReportModal });
    const { unmount } = render(
      <ModalProvider registry={registry}>
        <div />
      </ModalProvider>,
    );

    expect(registry.isReady()).toBe(true);

    unmount();

    await waitFor(() => {
      expect(registry.isReady()).toBe(false);
    });
  });

  it("should keep a shared registry bound to the previous provider after the latest provider unmounts", async () => {
    const registry = createModalRegistry({ renameReport: renameReportModal });

    const { rerender } = render(
      <SharedRegistryProviders registry={registry} showSecondProvider={true} />,
    );

    const secondResult = registry.open("renameReport", {
      currentName: "Second",
      reportId: "report-2",
    });

    expect(await screen.findByTestId("second-modal-shell")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await expect(secondResult).resolves.toEqual({
      name: "Second updated",
      status: "renamed",
    });

    rerender(
      <SharedRegistryProviders
        registry={registry}
        showSecondProvider={false}
      />,
    );

    expect(registry.isReady()).toBe(true);

    const firstResult = registry.open("renameReport", {
      currentName: "First",
      reportId: "report-1",
    });

    expect(await screen.findByTestId("first-modal-shell")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await expect(firstResult).resolves.toEqual({
      name: "First updated",
      status: "renamed",
    });
  });

  it("should throw when useModalManager is used outside ModalProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => render(<OpenRenameModalExample />)).toThrow(
      "Modal store must be used within ModalProvider",
    );

    consoleError.mockRestore();
  });
});
