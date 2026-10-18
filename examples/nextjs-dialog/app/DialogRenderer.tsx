"use client";

import { useModalManager } from "@okyrychenko-dev/react-modal-manager";
import { isDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ReactNode } from "react";

export function DialogRenderer(props: ModalRendererProps): ReactNode {
  const {
    children,
    modal: { instanceId, status },
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
    const target = opener.current;

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

  return (
    <Dialog.Root open={status === "open"} onOpenChange={handleOpenChange}>
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
