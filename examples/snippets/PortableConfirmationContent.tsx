import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { PortableDialogSurface } from "./PortableDialogSurface";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function PortableConfirmationContent(
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

  function handleDismissInteraction(event: Event): void {
    if (!dismissible) {
      event.preventDefault();
    }
  }

  function handleCancel(): void {
    close({ confirmed: false, reason: "cancel" });
  }

  function handleConfirm(): void {
    close({ confirmed: true });
  }

  return (
    <PortableDialogSurface
      onOpenAutoFocus={handleOpenAutoFocus}
      onEscapeKeyDown={handleDismissInteraction}
      onInteractOutside={handleDismissInteraction}
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
    </PortableDialogSurface>
  );
}
