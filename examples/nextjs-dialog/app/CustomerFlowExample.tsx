"use client";

import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import { useState } from "react";
import { confirmation } from "./confirmation.constants";
import { CustomerFlowLauncher } from "./CustomerFlowLauncher";
import { CustomerFlowRenderer } from "./CustomerFlowRenderer";
import type { ChangeEvent, ReactNode } from "react";

export function CustomerFlowExample(): ReactNode {
  const [mounted, setMounted] = useState(true);
  const [delayed, setDelayed] = useState(false);

  let closeDelayMs = 0;

  if (delayed) {
    closeDelayMs = 600;
  }

  function handleDelayedChange(event: ChangeEvent<HTMLInputElement>): void {
    setDelayed(event.target.checked);
  }

  function handleUnmountLauncher(): void {
    setMounted(false);
  }

  function handleMountLauncher(): void {
    setMounted(true);
  }

  return (
    <section>
      <h2>Customer workflow</h2>
      <label>
        <input
          type="checkbox"
          checked={delayed}
          onChange={handleDelayedChange}
        />
        Show 600 ms exit visuals
      </label>
      <ModalProvider
        renderer={CustomerFlowRenderer}
        confirmModal={confirmation}
        closeDelayMs={closeDelayMs}
      >
        {mounted ? (
          <CustomerFlowLauncher onUnmount={handleUnmountLauncher} />
        ) : (
          <button onClick={handleMountLauncher}>Mount flow launcher</button>
        )}
      </ModalProvider>
    </section>
  );
}
