import { useRef } from "react";
import {
  ModalDismissError,
  ModalRejectError,
  createModal,
  useModalManager,
} from "../../index";
import { ModalProvider } from "../ModalProvider";
import type { ReactNode } from "react";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
  ModalHandle,
  ModalRendererProps,
} from "../../index";
import type { ModalRegistryBinding } from "../../registry";

interface RenameReportInput {
  currentName: string;
  reportId: string;
}

interface RenameReportCanceledResult {
  status: "cancelled";
}

interface RenameReportRenamedResult {
  status: "renamed";
  name: string;
}

export type RenameReportResult =
  | RenameReportCanceledResult
  | RenameReportRenamedResult;

function RenameReportModal({
  close,
  dismiss,
  input,
  instanceId,
}: ModalComponentProps<RenameReportInput, RenameReportResult>) {
  const handleRename = (): void => {
    close({ name: `${input.currentName} updated`, status: "renamed" });
  };

  const handleDismiss = (): void => {
    dismiss();
  };

  return (
    <section aria-label="Rename report" role="dialog">
      <p>{input.currentName}</p>
      <p>{instanceId}</p>
      <button onClick={handleRename} type="button">
        Rename
      </button>
      <button onClick={handleDismiss} type="button">
        Dismiss
      </button>
    </section>
  );
}

export const renameReportModal = createModal<
  RenameReportInput,
  RenameReportResult
>({
  component: RenameReportModal,
});

function RejectWithStringModal({
  reject,
}: ModalComponentProps<undefined, never>) {
  const handleReject = (): void => {
    reject("failed");
  };

  return (
    <section aria-label="Reject with string" role="dialog">
      <button onClick={handleReject} type="button">
        Reject string
      </button>
    </section>
  );
}

const rejectWithStringModal = createModal<undefined, never>({
  component: RejectWithStringModal,
  id: "reject-string",
});

function RejectWithErrorModal({
  reject,
}: ModalComponentProps<undefined, never>) {
  const handleReject = (): void => {
    reject(new Error("Boom"));
  };

  return (
    <section aria-label="Reject with error" role="dialog">
      <button onClick={handleReject} type="button">
        Reject error
      </button>
    </section>
  );
}

const rejectWithErrorModal = createModal<undefined, never>({
  component: RejectWithErrorModal,
  id: "reject-error",
});

function CustomConfirmModal({
  close,
  input,
}: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>) {
  const handleCancel = (): void => {
    close({ confirmed: false, reason: "cancel" });
  };

  return (
    <section aria-label="Custom confirm" role="dialog">
      <h2>{input.title}</h2>
      <button onClick={handleCancel} type="button">
        Custom cancel
      </button>
    </section>
  );
}

export const customConfirmModal = createModal<
  ConfirmModalParams,
  ConfirmModalResult
>({
  component: CustomConfirmModal,
  id: "custom-confirm",
});

export function OpenRenameModalExample(): ReactNode {
  const modal = useModalManager();

  const handleOpen = (): void => {
    void modal
      .open(renameReportModal, { currentName: "Revenue", reportId: "report-1" })
      .then((result) => {
        if (result.status === "renamed") {
          document.body.dataset.result = result.name;
        }
      })
      .catch(() => {
        document.body.dataset.result = "dismissed";
      });
  };

  return (
    <button onClick={handleOpen} type="button">
      Open rename
    </button>
  );
}

export function ConfirmExample(): ReactNode {
  const modal = useModalManager();

  const handleAsk = (): void => {
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
  };

  return (
    <button onClick={handleAsk} type="button">
      Ask
    </button>
  );
}

export function NonDismissibleConfirmExample(): ReactNode {
  const modal = useModalManager();

  const handleAsk = (): void => {
    void modal
      .confirm({ dismissible: false, title: "Locked confirm?" })
      .catch(() => {
        document.body.dataset.confirmed = "dismissed";
      });
  };

  return (
    <button onClick={handleAsk} type="button">
      Ask locked
    </button>
  );
}

export function NonStringTitleConfirmExample(): ReactNode {
  const modal = useModalManager();

  const handleAsk = (): void => {
    void modal
      .confirm({ title: <span>Delete nested title?</span> })
      .catch(() => undefined);
  };

  return (
    <button type="button" onClick={handleAsk}>
      Ask with nested title
    </button>
  );
}

export function DismissExample(): ReactNode {
  const modal = useModalManager();

  const handleOpen = (): void => {
    void modal
      .open(renameReportModal, { currentName: "Revenue", reportId: "report-1" })
      .catch((error: unknown) => {
        if (error instanceof ModalDismissError) {
          document.body.dataset.dismissReason = error.reason;
        }
      });
  };

  return (
    <button onClick={handleOpen} type="button">
      Open dismissible
    </button>
  );
}

export function CloseAllExample(): ReactNode {
  const modal = useModalManager();

  const handleOpenTwo = (): void => {
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
            document.body.dataset.closeAllCount = String(currentCount + 1);
          }
        });
    }
  };

  const handleCloseAll = (): void => {
    modal.closeAll();
  };

  return (
    <>
      <button onClick={handleOpenTwo} type="button">
        Open two
      </button>
      <button onClick={handleCloseAll} type="button">
        Close all
      </button>
    </>
  );
}

export function RejectExample(): ReactNode {
  const modal = useModalManager();

  const handleOpenStringReject = (): void => {
    void modal
      .open(rejectWithStringModal, undefined)
      .catch((error: unknown) => {
        if (error instanceof ModalRejectError) {
          document.body.dataset.rejectValue = String(error.value);
        }
      });
  };

  const handleOpenErrorReject = (): void => {
    void modal.open(rejectWithErrorModal, undefined).catch((error: unknown) => {
      if (error instanceof Error) {
        document.body.dataset.rejectMessage = error.message;
      }
    });
  };

  return (
    <>
      <button onClick={handleOpenStringReject} type="button">
        Open string reject
      </button>
      <button onClick={handleOpenErrorReject} type="button">
        Open error reject
      </button>
    </>
  );
}

export function ExternalDismissExample(): ReactNode {
  const modal = useModalManager();
  const handleRef = useRef<ModalHandle<RenameReportResult> | undefined>(
    undefined,
  );

  const handleOpen = (): void => {
    const handle = modal.open(renameReportModal, {
      currentName: "Revenue",
      reportId: "report-1",
    });

    handleRef.current = handle;
    document.body.dataset.externalInstanceId = handle.instanceId;

    void handle.catch((error: unknown) => {
      if (error instanceof ModalDismissError) {
        document.body.dataset.externalDismissReason = error.reason;
      }
    });
  };

  const handleDismiss = (): void => {
    handleRef.current?.dismiss();
  };

  return (
    <>
      <button onClick={handleOpen} type="button">
        Open external dismiss
      </button>
      <button onClick={handleDismiss} type="button">
        Dismiss externally
      </button>
    </>
  );
}

export function ProviderUnmountExample(): ReactNode {
  const modal = useModalManager();

  const handleOpen = (): void => {
    void modal
      .open(renameReportModal, { currentName: "Revenue", reportId: "report-1" })
      .catch((error: unknown) => {
        if (error instanceof ModalDismissError) {
          document.body.dataset.unmountDismissReason = error.reason;
        }
      });
  };

  return (
    <button type="button" onClick={handleOpen}>
      Open before unmount
    </button>
  );
}

export function TestRenderer({
  children,
  modal,
}: ModalRendererProps): ReactNode {
  return (
    <div
      data-definition-id={modal.definitionId}
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

interface SharedRegistryProvidersProps {
  registry: ModalRegistryBinding;
  showSecondProvider: boolean;
}

export function SharedRegistryProviders({
  registry,
  showSecondProvider,
}: SharedRegistryProvidersProps): ReactNode {
  return (
    <>
      <ModalProvider registry={registry} renderer={FirstRenderer}>
        <div />
      </ModalProvider>
      {showSecondProvider && (
        <ModalProvider registry={registry} renderer={SecondRenderer}>
          <div />
        </ModalProvider>
      )}
    </>
  );
}
