"use client";

import { useModalManager } from "@okyrychenko-dev/react-modal-manager";
import { isDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";
import type { Nullable } from "@okyrychenko-dev/type-utils";
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
  const opener = useRef<Nullable<HTMLElement>>(null);

  function handleOpenChange(open: boolean): void {
    if (!open) {
      manager.dismiss(instanceId);
    }
  }

  function handleOpenAutoFocus(): void {
    if (isInstanceOf(document.activeElement, HTMLElement)) {
      opener.current = document.activeElement;
    }
  }

  function handleCloseAutoFocus(event: Event): void {
    event.preventDefault();
    // A departing shell must not take focus from a subsequent step or stack.
    const activeDialog = document.querySelector(
      '[role="dialog"][data-state="open"]',
    );
    if (isInstanceOf(activeDialog, HTMLElement)) {
      if (!activeDialog.contains(document.activeElement)) {
        activeDialog.focus();
      }
      return;
    }
    let target = opener.current;
    if (isDefined(returnFocusId)) {
      target = document.getElementById(returnFocusId);
    }

    if (
      isDefined(target) &&
      target.isConnected &&
      !target.matches(":disabled") &&
      !target.closest('[hidden], [inert], [aria-hidden="true"]')
    ) {
      target.focus();
      if (document.activeElement === target) {
        return;
      }
    }

    document.getElementById("workspace-focus")?.focus();
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
        <Dialog.Content
          className="dialog"
          onOpenAutoFocus={handleOpenAutoFocus}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
