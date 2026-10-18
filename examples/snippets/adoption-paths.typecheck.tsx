"use client";

import {
  ModalDismissError,
  ModalProvider,
  createModal,
  createModalRegistry,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef } from "react";
import type {
  ModalComponentProps,
  ModalHandle,
  ModalRendererProps,
} from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

interface RenameReportInput {
  reportId: string;
  currentName: string;
}

interface RenameReportSucceededResult {
  status: "renamed";
  name: string;
}

interface RenameReportCancelledResult {
  status: "cancelled";
}

type RenameReportResult =
  | RenameReportSucceededResult
  | RenameReportCancelledResult;

function RenameReportModal({
  close,
  input,
}: ModalComponentProps<RenameReportInput, RenameReportResult>): ReactNode {
  function handleCancel(): void {
    close({ status: "cancelled" });
  }

  function handleRename(): void {
    close({ status: "renamed", name: `${input.currentName} updated` });
  }

  return (
    <section aria-label={`Rename ${input.currentName}`}>
      <button onClick={handleCancel}>Cancel</button>
      <button onClick={handleRename}>Rename</button>
    </section>
  );
}

const renameReportModal = createModal<RenameReportInput, RenameReportResult>({
  component: RenameReportModal,
});

export const reportModals = createModalRegistry({
  renameReport: renameReportModal,
});

const workspaceModals = createModalRegistry({
  renameReport: renameReportModal,
});

export async function renameReportFromCommand(
  input: RenameReportInput,
): Promise<RenameReportResult> {
  return reportModals.open("renameReport", input);
}

function AppModalRenderer({ children, modal }: ModalRendererProps): ReactNode {
  return (
    <div data-modal-id={modal.instanceId} data-status={modal.status}>
      {children}
    </div>
  );
}

export function ReportsPage(): ReactNode {
  const modal = useModalManager();
  const pending = useRef(new Set<ModalHandle<RenameReportResult>>());

  useEffect(() => {
    const handles = pending.current;
    return () => {
      for (const handle of handles) {
        handle.dismiss();
      }
      handles.clear();
    };
  }, []);

  function handleDelete(): void {
    void modal
      .confirm({
        title: "Delete report?",
        description: "This action cannot be undone.",
        variant: "danger",
      })
      .then((result) => {
        if (result.confirmed) {
          window.localStorage.removeItem("report-1");
        } else {
          window.localStorage.setItem("last-delete-outcome", result.reason);
        }
      })
      .catch((error: unknown) => {
        if (!isInstanceOf(error, ModalDismissError)) {
          console.error(error);
        }
      });
  }

  function handleRename(): void {
    const handle = modal.open(renameReportModal, {
      reportId: "report-1",
      currentName: "Q3 report",
    });

    pending.current.add(handle);

    void handle
      .then((result) => {
        if (result.status === "renamed") {
          window.localStorage.setItem("report-1-name", result.name);
        }
      })
      .catch((error: unknown) => {
        if (!isInstanceOf(error, ModalDismissError)) {
          console.error(error);
        }
      })
      .finally(() => {
        pending.current.delete(handle);
      });
  }

  return (
    <>
      <button onClick={handleDelete}>Delete report</button>
      <button onClick={handleRename}>Rename report</button>
    </>
  );
}

export function AdoptionPathsExample(): ReactNode {
  return (
    <>
      <ModalProvider
        closeDelayMs={200}
        registry={reportModals}
        renderer={AppModalRenderer}
      >
        <ReportsPage />
      </ModalProvider>

      <ModalProvider registry={workspaceModals}>
        <ReportsPage />
      </ModalProvider>
    </>
  );
}
