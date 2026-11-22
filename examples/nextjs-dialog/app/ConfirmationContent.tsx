"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { DialogSurface } from "./DialogSurface";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";
import type { KeyboardEvent, ReactNode } from "react";
import type { InteractOutsideEvent } from "./ConfirmationContent.types";

export function ConfirmationContent(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
): ReactNode {
  const {
    input: {
      title,
      description,
      confirmText = "Confirm",
      cancelText = "Cancel",
      dismissible = true,
      variant = "default",
    },
    close,
  } = props;

  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  function handleOpenAutoFocus(event: Event): void {
    event.preventDefault();

    let initialFocus = confirmButton;
    if (variant === "danger") {
      initialFocus = cancelButton;
    }
    initialFocus.current?.focus();
  }

  function handleDismissInteraction(
    event: Pick<Event, "preventDefault">,
  ): void {
    event.preventDefault();

    if (dismissible) {
      close({ confirmed: false, reason: "dismiss" });
    }
  }

  function handleInteractOutside(event: InteractOutsideEvent): void {
    if (
      !event.defaultPrevented &&
      event.detail.originalEvent.type === "pointerdown"
    ) {
      handleDismissInteraction(event);
    }
  }

  function handleEscapeKeyDown(event: Event): void {
    // Radix may still route Escape to the previous layer during activation.
    // The focused content owns keyboard dismissal below.
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.stopPropagation();
      handleDismissInteraction(event);
    }
  }

  function handleCancel(): void {
    close({ confirmed: false, reason: "cancel" });
  }

  function handleConfirm(): void {
    close({ confirmed: true });
  }

  return (
    <DialogSurface
      onOpenAutoFocus={handleOpenAutoFocus}
      onEscapeKeyDown={handleEscapeKeyDown}
      onKeyDown={handleKeyDown}
      onInteractOutside={handleInteractOutside}
    >
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description asChild>
        <div>{description}</div>
      </Dialog.Description>
      <div className="actions">
        <button ref={cancelButton} onClick={handleCancel}>
          {cancelText}
        </button>
        <button ref={confirmButton} onClick={handleConfirm}>
          {confirmText}
        </button>
      </div>
      {dismissible && <p>Escape or click outside to dismiss.</p>}
    </DialogSurface>
  );
}
