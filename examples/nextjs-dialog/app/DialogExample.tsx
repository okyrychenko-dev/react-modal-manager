"use client";

import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import { useState } from "react";
import { confirmation } from "./confirmation.constants";
import { ConfirmationLauncher } from "./ConfirmationLauncher";
import { DialogRenderer } from "./DialogRenderer";
import { RecoveryLauncher } from "./RecoveryLauncher";
import type { ReactNode } from "react";

export function DialogExample(): ReactNode {
  const [mounted, setMounted] = useState(true);
  const [outcome, setOutcome] = useState("Ready");

  function handleUnmountLauncher(): void {
    setMounted(false);
  }

  function handleMountLauncher(): void {
    setMounted(true);
  }

  return (
    <ModalProvider renderer={DialogRenderer} confirmModal={confirmation}>
      <h2 id="workspace-focus" tabIndex={-1}>
        Confirmation actions
      </h2>
      {mounted ? (
        <ConfirmationLauncher
          onOutcome={setOutcome}
          onUnmount={handleUnmountLauncher}
        />
      ) : (
        <button onClick={handleMountLauncher}>Mount launcher</button>
      )}
      <p role="status">{outcome}</p>
      <h2>Local render-error recovery</h2>
      <RecoveryLauncher />
    </ModalProvider>
  );
}
