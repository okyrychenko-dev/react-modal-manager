import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import { ConfirmationButton } from "./ConfirmationButton";
import { portableConfirmation } from "./portable-confirmation.constants";
import { PortableDialogRenderer } from "./PortableDialogRenderer";
import type { ReactNode } from "react";

export function PortableReactExample(): ReactNode {
  return (
    <ModalProvider
      renderer={PortableDialogRenderer}
      confirmModal={portableConfirmation}
    >
      <h1 id="portable-workspace" tabIndex={-1}>
        Confirmation example
      </h1>
      <ConfirmationButton />
    </ModalProvider>
  );
}
