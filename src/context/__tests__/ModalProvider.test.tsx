import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createModal } from "../../createModal";
import { createModalController } from "../../createModalController";
import { ModalDismissError, ModalRejectError } from "../../errors";
import { useModalManager } from "../../hooks/useModalManager";
import { ModalProvider } from "../ModalProvider";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
  ModalController,
  ModalRendererProps,
} from "../../types";

interface RenameReportInput {
  currentName: string;
  reportId: string;
}

type RenameReportResult =
  | {
      status: "cancelled";
    }
  | {
      name: string;
      status: "renamed";
    };

function RenameReportModal({
  close,
  dismiss,
  input,
  instanceId,
}: ModalComponentProps<RenameReportInput, RenameReportResult>) {
  return (
    <section aria-label="Rename report" role="dialog">
      <p>{input.currentName}</p>
      <p>{instanceId}</p>
      <button
        onClick={() => {
          close({
            name: `${input.currentName} updated`,
            status: "renamed",
          });
        }}
        type="button"
      >
        Rename
      </button>
      <button
        onClick={() => {
          dismiss();
        }}
        type="button"
      >
        Dismiss
      </button>
    </section>
  );
}

const renameReportModal = createModal<RenameReportInput, RenameReportResult>({
  component: RenameReportModal,
  id: "rename-report",
});

const rejectWithStringModal = createModal<undefined, never>({
  component: ({ reject }) => (
    <section aria-label="Reject with string" role="dialog">
      <button
        onClick={() => {
          reject("failed");
        }}
        type="button"
      >
        Reject string
      </button>
    </section>
  ),
  id: "reject-string",
});

const rejectWithErrorModal = createModal<undefined, never>({
  component: ({ reject }) => (
    <section aria-label="Reject with error" role="dialog">
      <button
        onClick={() => {
          reject(new Error("Boom"));
        }}
        type="button"
      >
        Reject error
      </button>
    </section>
  ),
  id: "reject-error",
});

const customConfirmModal = createModal<ConfirmModalParams, ConfirmModalResult>({
  component: ({ close, input }) => (
    <section aria-label="Custom confirm" role="dialog">
      <h2>{input.title}</h2>
      <button
        onClick={() => {
          close({
            confirmed: false,
            reason: "cancel",
          });
        }}
        type="button"
      >
        Custom cancel
      </button>
    </section>
  ),
  id: "custom-confirm",
});

function OpenRenameModalExample() {
  const modal = useModalManager();

  return (
    <button
      onClick={() => {
        void modal
          .open(renameReportModal, {
            currentName: "Revenue",
            reportId: "report-1",
          })
          .then((result) => {
            if (result.status === "renamed") {
              document.body.dataset.result = result.name;
            }
          })
          .catch(() => {
            document.body.dataset.result = "dismissed";
          });
      }}
      type="button"
    >
      Open rename
    </button>
  );
}

function ConfirmExample() {
  const modal = useModalManager();

  return (
    <button
      onClick={() => {
        void modal
          .confirm({
            confirmText: "Delete",
            description: "This action cannot be undone.",
            title: "Delete report?",
            variant: "danger",
          })
          .then((result) => {
            document.body.dataset.confirmed = String(result.confirmed);
          });
      }}
      type="button"
    >
      Ask
    </button>
  );
}

function NonDismissibleConfirmExample() {
  const modal = useModalManager();

  return (
    <button
      onClick={() => {
        void modal
          .confirm({
            dismissible: false,
            title: "Locked confirm?",
          })
          .catch(() => {
            document.body.dataset.confirmed = "dismissed";
          });
      }}
      type="button"
    >
      Ask locked
    </button>
  );
}

function DismissExample() {
  const modal = useModalManager();

  return (
    <button
      onClick={() => {
        void modal
          .open(renameReportModal, {
            currentName: "Revenue",
            reportId: "report-1",
          })
          .catch((error: unknown) => {
            if (error instanceof ModalDismissError) {
              document.body.dataset.dismissReason = error.reason;
            }
          });
      }}
      type="button"
    >
      Open dismissible
    </button>
  );
}

function CloseAllExample() {
  const modal = useModalManager();

  return (
    <>
      <button
        onClick={() => {
          for (const currentName of ["Revenue", "Cost"]) {
            void modal
              .open(renameReportModal, {
                currentName,
                reportId: currentName,
              })
              .catch((error: unknown) => {
                if (error instanceof ModalDismissError) {
                  const currentCount = Number(
                    document.body.dataset.closeAllCount ?? "0",
                  );
                  document.body.dataset.closeAllCount = String(
                    currentCount + 1,
                  );
                }
              });
          }
        }}
        type="button"
      >
        Open two
      </button>
      <button
        onClick={() => {
          modal.closeAll();
        }}
        type="button"
      >
        Close all
      </button>
    </>
  );
}

function RejectExample() {
  const modal = useModalManager();

  return (
    <>
      <button
        onClick={() => {
          void modal
            .open(rejectWithStringModal, undefined)
            .catch((error: unknown) => {
              if (error instanceof ModalRejectError) {
                document.body.dataset.rejectValue = String(error.value);
              }
            });
        }}
        type="button"
      >
        Open string reject
      </button>
      <button
        onClick={() => {
          void modal
            .open(rejectWithErrorModal, undefined)
            .catch((error: unknown) => {
              if (error instanceof Error) {
                document.body.dataset.rejectMessage = error.message;
              }
            });
        }}
        type="button"
      >
        Open error reject
      </button>
    </>
  );
}

function ExternalDismissExample() {
  const modal = useModalManager();

  return (
    <>
      <button
        onClick={() => {
          void modal
            .open(renameReportModal, {
              currentName: "Revenue",
              reportId: "report-1",
            })
            .catch((error: unknown) => {
              if (error instanceof ModalDismissError) {
                document.body.dataset.externalDismissReason = error.reason;
              }
            });
        }}
        type="button"
      >
        Open external dismiss
      </button>
      <button
        onClick={() => {
          modal.dismiss("modal-0");
        }}
        type="button"
      >
        Dismiss externally
      </button>
    </>
  );
}

function ProviderUnmountExample() {
  const modal = useModalManager();

  return (
    <button
      onClick={() => {
        void modal
          .open(renameReportModal, {
            currentName: "Revenue",
            reportId: "report-1",
          })
          .catch((error: unknown) => {
            if (error instanceof ModalDismissError) {
              document.body.dataset.unmountDismissReason = error.reason;
            }
          });
      }}
      type="button"
    >
      Open before unmount
    </button>
  );
}

function TestRenderer({ children, modal }: ModalRendererProps) {
  return (
    <div
      data-instance-id={modal.instanceId}
      data-status={modal.status}
      data-testid="modal-shell"
    >
      {children}
    </div>
  );
}

function FirstRenderer({ children }: ModalRendererProps) {
  return <div data-testid="first-modal-shell">{children}</div>;
}

function SecondRenderer({ children }: ModalRendererProps) {
  return <div data-testid="second-modal-shell">{children}</div>;
}

interface SharedControllerProvidersProps {
  controller: ModalController;
  showSecondProvider: boolean;
}

function SharedControllerProviders({
  controller,
  showSecondProvider,
}: SharedControllerProvidersProps) {
  return (
    <>
      <ModalProvider controller={controller} renderer={FirstRenderer}>
        <div />
      </ModalProvider>
      {showSecondProvider ? (
        <ModalProvider controller={controller} renderer={SecondRenderer}>
          <div />
        </ModalProvider>
      ) : null}
    </>
  );
}

describe("ModalProvider", () => {
  afterEach(() => {
    delete document.body.dataset.closeAllCount;
    delete document.body.dataset.confirmed;
    delete document.body.dataset.dismissReason;
    delete document.body.dataset.externalDismissReason;
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

  it("should dismiss an active modal from the modal manager", async () => {
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

      return (
        <button
          onClick={() => {
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
          }}
          type="button"
        >
          Open provider one
        </button>
      );
    }

    function ProviderTwoExample() {
      const modal = useModalManager();

      return (
        <button
          onClick={() => {
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
          }}
          type="button"
        >
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

  it("should open typed modals through a provider-bound controller", async () => {
    const controller = createModalController();

    render(
      <ModalProvider controller={controller}>
        <div />
      </ModalProvider>,
    );

    expect(controller.isReady()).toBe(true);

    const resultPromise = controller.open(renameReportModal, {
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

  it("should reject controller calls before it is bound to a provider", () => {
    const controller = createModalController();

    expect(() => {
      void controller.open(renameReportModal, {
        currentName: "Revenue",
        reportId: "report-1",
      });
    }).toThrow("Modal controller is not bound to a mounted ModalProvider");
  });

  it("should unbind a controller when its provider unmounts", async () => {
    const controller = createModalController();
    const { unmount } = render(
      <ModalProvider controller={controller}>
        <div />
      </ModalProvider>,
    );

    expect(controller.isReady()).toBe(true);

    unmount();

    await waitFor(() => {
      expect(controller.isReady()).toBe(false);
    });
  });

  it("should keep a shared controller bound to the previous provider after the latest provider unmounts", async () => {
    const controller = createModalController();
    const { rerender } = render(
      <SharedControllerProviders
        controller={controller}
        showSecondProvider={true}
      />,
    );

    const secondResult = controller.open(renameReportModal, {
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
      <SharedControllerProviders
        controller={controller}
        showSecondProvider={false}
      />,
    );

    expect(controller.isReady()).toBe(true);

    const firstResult = controller.open(renameReportModal, {
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
      "ModalManager store hooks must be used within a ModalManagerProvider",
    );

    consoleError.mockRestore();
  });
});
