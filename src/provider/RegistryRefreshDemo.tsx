import { useMemo, useState } from "react";
import { createModal, createModalRegistry } from "../registry";
import { ModalProvider } from "./ModalProvider";
import { RegistryRefreshConfirm } from "./RegistryRefreshConfirm";
import type { ReactElement } from "react";
import type { ConfirmModalParams, ConfirmModalResult } from "../confirm";

const customConfirm = createModal<ConfirmModalParams, ConfirmModalResult>({
  component: RegistryRefreshConfirm,
});

export function RegistryRefreshDemo(): ReactElement {
  const registry = useMemo(() => createModalRegistry({}), []);
  const [updated, setUpdated] = useState(false);
  const [mountedB, setMountedB] = useState(false);
  const [outcome, setOutcome] = useState("Ready");
  const open = (): void => {
    void registry
      .confirm({
        title: "Routing confirmation",
        description: "Updated A configuration",
      })
      .then(() => {
        setOutcome("Confirmed");
      })
      .catch((error: unknown) => {
        setOutcome("Rejected");
        console.error(error);
      });
  };
  let confirmModal;
  if (updated) {
    confirmModal = customConfirm;
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setMountedB(true);
        }}
      >
        Mount B
      </button>
      <button
        type="button"
        onClick={() => {
          setUpdated(true);
        }}
      >
        Update A
      </button>
      <button
        type="button"
        onClick={() => {
          setMountedB(false);
        }}
      >
        Unmount B
      </button>
      <button type="button" onClick={open}>
        Open through registry
      </button>
      <p role="status">{outcome}</p>
      <div data-testid="provider-a">
        <ModalProvider registry={registry} confirmModal={confirmModal}>
          <p>Provider A</p>
        </ModalProvider>
      </div>
      {mountedB && (
        <div data-testid="provider-b">
          <ModalProvider registry={registry}>
            <p>Provider B</p>
          </ModalProvider>
        </div>
      )}
    </div>
  );
}
