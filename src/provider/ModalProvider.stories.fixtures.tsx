import { useEffect, useRef, useState } from "react";
import { ModalDismissError, ModalRejectError, useModalManager } from "../index";
import {
  StoryLayout,
  rejectWithStringModal,
  renameReportModal,
  styles,
} from "../stories";
import type { ReactElement } from "react";

function describeDismissal(error: unknown): string {
  if (error instanceof ModalDismissError) {
    return `Dismissed: ${error.reason}`;
  }

  return "Rejected";
}

function describeRejection(error: unknown): string {
  if (error instanceof ModalRejectError) {
    return `Wrapped reject value: ${String(error.value)}`;
  }

  return "Rejected with Error";
}

export function DismissRejectDemo(): ReactElement {
  const modal = useModalManager();
  const dismissTimers = useRef(new Set<number>());
  const [state, setState] = useState(
    "Open a modal to inspect rejection behavior",
  );

  useEffect(
    () => () => {
      for (const timer of dismissTimers.current) {
        window.clearTimeout(timer);
      }

      dismissTimers.current.clear();
    },
    [],
  );

  const scheduleDismiss = (dismiss: VoidFunction): void => {
    const timer = window.setTimeout(() => {
      dismissTimers.current.delete(timer);
      dismiss();
    }, 500);

    dismissTimers.current.add(timer);
  };

  const handleDismissFromManager = (): void => {
    const handle = modal.open(renameReportModal, {
      currentName: "Dismiss me",
      reportId: "report-dismiss",
    });

    void handle.catch((error: unknown) => {
      setState(describeDismissal(error));
    });
    scheduleDismiss(() => {
      modal.dismiss(handle.instanceId);
    });
  };

  const handleDismissFromHandle = (): void => {
    const handle = modal.open(renameReportModal, {
      currentName: "Dismiss my handle",
      reportId: "handle-dismiss",
    });

    void handle.catch((error: unknown) => {
      setState(describeDismissal(error));
    });
    scheduleDismiss(() => {
      handle.dismiss();
    });
  };

  const handleReject = (): void => {
    void modal
      .open(rejectWithStringModal, undefined)
      .catch((error: unknown) => {
        setState(describeRejection(error));
      });
  };

  return (
    <StoryLayout
      description="Dismiss through the manager or handle, or inspect wrapping for an unknown rejection value."
      results={[{ label: "Promise state", value: state }]}
      title="Dismiss And Reject"
    >
      <div className={styles.buttonRow}>
        <button
          className={styles.button}
          onClick={handleDismissFromManager}
          type="button"
        >
          Auto dismiss from manager
        </button>
        <button
          className={styles.button}
          onClick={handleDismissFromHandle}
          type="button"
        >
          Auto dismiss from handle
        </button>
        <button
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={handleReject}
          type="button"
        >
          Open rejecting modal
        </button>
      </div>
    </StoryLayout>
  );
}
