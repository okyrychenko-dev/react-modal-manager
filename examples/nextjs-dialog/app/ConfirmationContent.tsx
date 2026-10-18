"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function ConfirmationContent(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
): ReactNode {
  const {
    input: {
      title,
      description,
      confirmText = "Confirm",
      cancelText = "Cancel",
    },
    close,
  } = props;

  function handleCancel(): void {
    close({ confirmed: false, reason: "cancel" });
  }

  function handleConfirm(): void {
    close({ confirmed: true });
  }

  return (
    <>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description asChild>
        <div>{description}</div>
      </Dialog.Description>
      <div className="actions">
        <button onClick={handleCancel}>{cancelText}</button>
        <button onClick={handleConfirm}>{confirmText}</button>
      </div>
      <p>Escape or click outside to dismiss.</p>
    </>
  );
}
