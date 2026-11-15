import {
  ModalDismissError,
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useState } from "react";
import { portableConfirmation } from "../portable-confirmation.constants";
import { PortableDialogRenderer } from "../PortableDialogRenderer";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ChangeEvent, ReactNode } from "react";

export function ConfirmationHarness(): ReactNode {
  function createRegistry(): ReturnType<typeof createModalRegistry> {
    return createModalRegistry({});
  }

  const [registry] = useState(createRegistry);
  const [policy, setPolicy] = useState("default");
  const [outcome, setOutcome] = useState("Ready");
  const [neighborOutcome, setNeighborOutcome] = useState("Ready");

  function open(neighbor = false): void {
    let dismissible: Optional<boolean>;

    if (policy !== "default") {
      dismissible = policy === "enabled";
    }

    let params: ConfirmModalParams = { title: "Decision" };

    if (policy !== "default") {
      params = { ...params, dismissible };
    }

    if (neighbor) {
      params = { ...params, title: "Neighbor" };
    } else {
      params = {
        ...params,
        description: (
          <>
            <button onClick={handleOpenNeighbor}>Open neighbor</button>
            <button onClick={handleDismiss}>Dismiss owner</button>
          </>
        ),
      };
    }

    const handle = registry.confirm(params);
    const report = neighbor ? setNeighborOutcome : setOutcome;

    function handleOpenNeighbor(): void {
      open(true);
    }

    function handleDismiss(): void {
      handle.dismiss();
    }

    function handleResult(result: ConfirmModalResult): void {
      report(result.confirmed ? "Confirmed" : result.reason);
    }

    function handleError(error: unknown): void {
      if (isInstanceOf(error, ModalDismissError)) {
        report(`Rejected: ${error.reason}`);
      } else {
        throw error;
      }
    }

    void handle.then(handleResult, handleError);
  }

  function handlePolicyChange(event: ChangeEvent<HTMLSelectElement>): void {
    setPolicy(event.target.value);
  }

  function handleOpen(): void {
    open();
  }

  return (
    <ModalProvider
      registry={registry}
      renderer={PortableDialogRenderer}
      confirmModal={portableConfirmation}
    >
      <h1 id="portable-workspace" tabIndex={-1}>
        Workspace
      </h1>
      <label>
        Policy
        <select value={policy} onChange={handlePolicyChange}>
          <option value="default">Default</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      <button onClick={handleOpen}>Open decision</button>
      <p data-testid="outcome">{outcome}</p>
      <p data-testid="neighbor-outcome">{neighborOutcome}</p>
    </ModalProvider>
  );
}
