import { useModalManager } from "@okyrychenko-dev/react-modal-manager";
import * as Dialog from "@radix-ui/react-dialog";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function PortableDialogRenderer({
  children,
  modal,
}: ModalRendererProps): ReactNode {
  const manager = useModalManager();
  const { instanceId, status } = modal;

  function handleOpenChange(open: boolean): void {
    if (!open && status === "open") {
      manager.dismiss(instanceId);
    }
  }

  return (
    <Dialog.Root open={status === "open"} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="portable-overlay" />
        {children}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
