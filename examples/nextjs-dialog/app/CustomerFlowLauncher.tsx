"use client";

import {
  ModalDismissError,
  useModalManager,
  useOwnedModalHandles,
} from "@okyrychenko-dev/react-modal-manager";
import { isError, isInstanceOf, isNull } from "@okyrychenko-dev/type-utils";
import { useRef, useState } from "react";
import { confirmation } from "./confirmation.constants";
import { CUSTOMERS, editor, selection } from "./customerFlow.constants";
import type { ReactNode } from "react";

interface CustomerFlowLauncherProps {
  onUnmount: VoidFunction;
}

export function CustomerFlowLauncher(
  props: CustomerFlowLauncherProps,
): ReactNode {
  const { onUnmount } = props;
  const manager = useModalManager();
  const owner = useOwnedModalHandles();
  const activeRun = useRef(false);
  const [outcome, setOutcome] = useState("No customer saved");
  const [busy, setBusy] = useState(false);

  async function start(): Promise<void> {
    if (activeRun.current) {
      return;
    }

    activeRun.current = true;

    const isActive = owner.captureLifetime();

    setBusy(true);
    setOutcome("Selecting customer");

    try {
      const customer = await owner.track(manager.open(selection, CUSTOMERS));

      if (!isActive()) {
        return;
      }

      if (isNull(customer)) {
        setOutcome("Cancelled: selection");
        return;
      }

      setOutcome("Selection settled; editing customer");

      const edited = await owner.track(manager.open(editor, customer));

      if (!isActive()) {
        return;
      }

      if (isNull(edited)) {
        setOutcome("Cancelled: editing");
        return;
      }

      setOutcome("Editing settled; awaiting confirmation");

      const result = await owner.track(
        manager.open(confirmation, {
          title: `Save ${edited.name}?`,
          description: (
            <button onClick={onUnmount}>Unmount flow launcher</button>
          ),
          confirmText: "Save customer",
        }),
      );

      if (!isActive()) {
        return;
      }

      if (result.confirmed) {
        setOutcome(`Saved: ${edited.name}`);
      } else {
        setOutcome("Cancelled: confirmation");
      }
    } catch (error: unknown) {
      if (!isActive()) {
        return;
      }

      if (isInstanceOf(error, ModalDismissError)) {
        setOutcome(`Flow dismissed: ${error.reason}`);
      } else {
        setOutcome(
          isError(error) ? `Flow failed: ${error.message}` : "Flow failed",
        );
      }
    } finally {
      if (isActive()) {
        activeRun.current = false;

        setBusy(false);
      }
    }
  }

  function handleStart(): void {
    void start();
  }

  return (
    <>
      <button id="customer-flow-start" disabled={busy} onClick={handleStart}>
        Start customer flow
      </button>
      <p data-testid="flow-outcome">{outcome}</p>
    </>
  );
}
