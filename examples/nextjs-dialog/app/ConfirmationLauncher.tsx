"use client";

import {
  ModalDismissError,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isError, isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef } from "react";
import type {
  ConfirmModalResult,
  ModalHandle,
} from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

interface ConfirmationLauncherProps {
  onOutcome: (message: string) => void;
  onUnmount: VoidFunction;
}

export function ConfirmationLauncher(
  props: ConfirmationLauncherProps,
): ReactNode {
  const { onOutcome, onUnmount } = props;

  const manager = useModalManager();
  const pending = useRef(new Set<ModalHandle<ConfirmModalResult>>());

  useEffect(() => {
    const handles = pending.current;

    return () => {
      for (const handle of handles) {
        handle.dismiss();
      }
      handles.clear();
    };
  }, []);

  function handleOpenConfirmation(): void {
    const handle = manager.confirm({
      title: "Delete report?",
      description: (
        <>
          <p>This example keeps your data unchanged.</p>
          <div className="actions">
            <button onClick={handleDismiss}>Dismiss retained handle</button>
            <button onClick={onUnmount}>Unmount launcher</button>
          </div>
        </>
      ),
      confirmText: "Delete report",
    });

    function handleDismiss(): void {
      handle.dismiss();
    }

    pending.current.add(handle);

    void handle
      .then((result) => {
        if (result.confirmed) {
          onOutcome("Confirmed");
        } else {
          onOutcome(`Cancelled: ${result.reason}`);
        }
      })
      .catch((error: unknown) => {
        if (isInstanceOf(error, ModalDismissError)) {
          onOutcome(`Dismissed: ${error.reason}`);
        } else {
          const message = isError(error)
            ? `Failed: ${error.message}`
            : "Failed: unknown error";

          onOutcome(message);

          console.error(error);
        }
      })
      .finally(() => {
        pending.current.delete(handle);
      });
  }

  return <button onClick={handleOpenConfirmation}>Open confirmation</button>;
}
