import { useId } from "react";
import { createModal } from "../createModal";
import {
  DEFAULT_CANCEL_TEXT,
  DEFAULT_CONFIRM_TEXT,
} from "./confirmModal.constants";
import type { ReactNode } from "react";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalComponentProps,
} from "../types";

function ConfirmModal(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
): ReactNode {
  const { close, input } = props;

  const cancelText = input.cancelText ?? DEFAULT_CANCEL_TEXT;
  const confirmText = input.confirmText ?? DEFAULT_CONFIRM_TEXT;
  const variant = input.variant ?? "default";
  const titleId = useId();

  const handleCancel = (): void => {
    close({ confirmed: false, reason: "cancel" });
  };

  const handleConfirm = (): void => {
    close({ confirmed: true });
  };

  const handleDismiss = (): void => {
    close({ confirmed: false, reason: "dismiss" });
  };

  return (
    <section aria-labelledby={titleId} data-variant={variant} role="dialog">
      <h2 id={titleId}>{input.title}</h2>

      {input.description === undefined ? null : <p>{input.description}</p>}

      <button type="button" onClick={handleCancel}>
        {cancelText}
      </button>

      <button type="button" onClick={handleConfirm}>
        {confirmText}
      </button>

      {input.dismissible === false ? null : (
        <button aria-label="Dismiss" type="button" onClick={handleDismiss}>
          Dismiss
        </button>
      )}
    </section>
  );
}

export const confirmModal = createModal<ConfirmModalParams, ConfirmModalResult>(
  {
    id: "confirm",
    component: ConfirmModal,
  },
);
