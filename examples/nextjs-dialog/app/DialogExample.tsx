"use client";

import {
  ModalProvider,
  createModal,
} from "@okyrychenko-dev/react-modal-manager";
import { useState } from "react";
import { ConfirmationContent } from "./ConfirmationContent";
import { ConfirmationLauncher } from "./ConfirmationLauncher";
import { DialogRenderer } from "./DialogRenderer";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

const confirmation = createModal<ConfirmModalParams, ConfirmModalResult>({
  component: ConfirmationContent,
});

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
    </ModalProvider>
  );
}
