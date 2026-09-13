"use client";

import {
  ModalProvider,
  createModal,
  createModalRegistry,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
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
  return (
    <section aria-label={`Rename ${input.currentName}`}>
      <button onClick={() => close({ status: "cancelled" })}>Cancel</button>
      <button
        onClick={() =>
          close({ status: "renamed", name: `${input.currentName} updated` })
        }
      >
        Rename
      </button>
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

const openRenameHandles = new Map<string, ModalHandle<RenameReportResult>>();

function trackRenameHandle(handle: ModalHandle<RenameReportResult>): void {
  openRenameHandles.set(handle.instanceId, handle);

  function stopTracking(): void {
    openRenameHandles.delete(handle.instanceId);
  }

  void handle.then(stopTracking, stopTracking);
}

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

function ReportsPage(): ReactNode {
  const modal = useModalManager();

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
      });
  }

  function handleRename(): void {
    const handle = modal.open(renameReportModal, {
      reportId: "report-1",
      currentName: "Q3 report",
    });

    trackRenameHandle(handle);

    void handle.then((result) => {
      if (result.status === "renamed") {
        window.localStorage.setItem("report-1-name", result.name);
      }
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
