"use client";

import {
  ModalDismissError,
  createModal,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isError, isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useEffect, useRef, useState } from "react";
import { confirmation } from "./confirmation.constants";
import { RecoverableContent } from "./RecoverableContent";
import type { ModalHandle } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

const failing = createModal<undefined, undefined>({
  component: RecoverableContent,
});

export function RecoveryLauncher(): ReactNode {
  const manager = useModalManager();
  const pending = useRef(new Set<ModalHandle<unknown>>());
  const [outcome, setOutcome] = useState("Recovery ready");
  const [settlements, setSettlements] = useState(0);
  const [busy, setBusy] = useState(false);
  const [neighborOutcome, setNeighborOutcome] = useState("Neighbor ready");

  useEffect(() => {
    const handles = pending.current;
    return () => {
      for (const handle of handles) {
        handle.dismiss();
      }
      handles.clear();
    };
  }, []);

  async function openFailure(): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);
    setOutcome("Recovery pending");

    const handle = manager.open(failing);

    pending.current.add(handle);

    try {
      await handle;
      setOutcome("Unexpected recovery success");
    } catch (error: unknown) {
      if (isInstanceOf(error, ModalDismissError)) {
        setOutcome(`Recovered: ${error.reason}`);
      } else {
        const message = isError(error)
          ? `Recovery failed: ${error.message}`
          : "Recovery failed";

        setOutcome(message);
      }
    } finally {
      pending.current.delete(handle);

      setSettlements((count) => count + 1);
      setBusy(false);
    }
  }

  async function openNeighbor(): Promise<void> {
    const handle = manager.open(confirmation, {
      title: "Keep this operation",
      description: (
        <button onClick={handleOpenFailure}>
          Open failing dialog above this
        </button>
      ),
      confirmText: "Complete neighbor",
    });

    pending.current.add(handle);

    setNeighborOutcome("Neighbor pending");

    try {
      const result = await handle;

      if (result.confirmed) {
        setNeighborOutcome("Neighbor confirmed");
      } else {
        setNeighborOutcome("Neighbor cancelled");
      }
    } catch (error: unknown) {
      if (isInstanceOf(error, ModalDismissError)) {
        setNeighborOutcome("Neighbor dismissed");
      } else {
        setNeighborOutcome("Neighbor failed");
      }
    } finally {
      pending.current.delete(handle);
    }
  }

  function handleOpenFailure(): void {
    void openFailure();
  }

  function handleOpenNeighbor(): void {
    void openNeighbor();
  }

  return (
    <>
      <button disabled={busy} onClick={handleOpenFailure}>
        Open failing dialog
      </button>
      <p data-testid="recovery-outcome">{outcome}</p>
      <p data-testid="recovery-settlements">Settlements: {settlements}</p>
      <button onClick={handleOpenNeighbor}>Open recovery neighbor</button>
      <p data-testid="neighbor-outcome">{neighborOutcome}</p>
    </>
  );
}
