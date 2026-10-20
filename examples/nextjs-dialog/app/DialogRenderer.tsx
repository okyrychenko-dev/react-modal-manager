"use client";

import { useModalManager } from "@okyrychenko-dev/react-modal-manager";
import * as Dialog from "@radix-ui/react-dialog";
import { DialogFocusContext } from "./DialogFocusContext";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

interface DialogRendererProps extends ModalRendererProps {
  returnFocusId?: string;
}

export function DialogRenderer(props: DialogRendererProps): ReactNode {
  const {
    children,
    modal: { instanceId, status },
    returnFocusId,
  } = props;

  const manager = useModalManager();

  function handleOpenChange(open: boolean): void {
    if (!open) {
      manager.dismiss(instanceId);
    }
  }

  if (status === "closing") {
    return (
      <div
        className="dialog closing-visual"
        data-testid="closing-visual"
        aria-hidden="true"
        inert
      >
        Closing previous step…
      </div>
    );
  }

  return (
    <Dialog.Root open onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <DialogFocusContext.Provider value={returnFocusId}>
          {children}
        </DialogFocusContext.Provider>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
