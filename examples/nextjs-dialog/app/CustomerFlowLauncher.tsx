"use client";

import {
  ModalDismissError,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isError, isInstanceOf, isNull } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef, useState } from "react";
import { confirmation } from "./confirmation.constants";
import { CUSTOMERS, editor, selection } from "./customerFlow.constants";
import type { ModalHandle } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";
import type { FlowRun } from "./customerFlow.types";

interface CustomerFlowLauncherProps {
  onUnmount: VoidFunction;
}

export function CustomerFlowLauncher(
  props: CustomerFlowLauncherProps,
): ReactNode {
  const { onUnmount } = props;
  const manager = useModalManager();
  const run = useRef<FlowRun>({ active: false, pending: new Set() });
  const [outcome, setOutcome] = useState("No customer saved");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      const current = run.current;

      current.active = false;

      for (const handle of current.pending) {
        handle.dismiss();
      }

      current.pending.clear();
    };
  }, []);

  async function start(): Promise<void> {
    if (run.current.active) {
      return;
    }

    const current: FlowRun = { active: true, pending: new Set() };

    function isActive(): boolean {
      return current.active;
    }

    run.current = current;

    setBusy(true);
    setOutcome("Selecting customer");

    async function waitFor<TResult>(
      handle: ModalHandle<TResult>,
    ): Promise<TResult> {
      current.pending.add(handle);

      try {
        return await handle;
      } finally {
        current.pending.delete(handle);
      }
    }

    try {
      const customer = await waitFor(manager.open(selection, CUSTOMERS));

      if (!isActive()) {
        return;
      }

      if (isNull(customer)) {
        setOutcome("Cancelled: selection");
        return;
      }

      setOutcome("Selection settled; editing customer");

      const edited = await waitFor(manager.open(editor, customer));

      if (!isActive()) {
        return;
      }

      if (isNull(edited)) {
        setOutcome("Cancelled: editing");
        return;
      }

      setOutcome("Editing settled; awaiting confirmation");

      const result = await waitFor(
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
      if (current.active) {
        current.active = false;

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
