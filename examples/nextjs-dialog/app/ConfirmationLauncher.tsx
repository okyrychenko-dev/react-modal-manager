"use client";

import {
  ModalDismissError,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isError, isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef, useState } from "react";
import { confirmation } from "./confirmation.constants";
import type {
  ConfirmModalResult,
  ModalHandle,
} from "@okyrychenko-dev/react-modal-manager";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ChangeEvent, ReactNode } from "react";

interface ConfirmationLauncherProps {
  onOutcome: (message: string) => void;
  onUnmount: VoidFunction;
}

export function ConfirmationLauncher(
  props: ConfirmationLauncherProps,
): ReactNode {
  const { onOutcome, onUnmount } = props;

  const [dismissible, setDismissible] = useState<Optional<boolean>>(undefined);
  const [danger, setDanger] = useState(false);

  function handleDismissibleChange(
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    const { value } = event.target;

    if (value === "default") {
      setDismissible(undefined);
    } else {
      setDismissible(value === "enabled");
    }
  }

  function handleDangerChange(event: ChangeEvent<HTMLInputElement>): void {
    setDanger(event.target.checked);
  }

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
    const variant = danger ? "danger" : "default";

    const handle = manager.open(confirmation, {
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
      dismissible,
      variant,
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

  return (
    <>
      <label>
        Dismissal policy
        <select defaultValue="default" onChange={handleDismissibleChange}>
          <option value="default">Default</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={danger} onChange={handleDangerChange} />
        Dangerous confirmation
      </label>
      <button onClick={handleOpenConfirmation}>Open confirmation</button>
    </>
  );
}
