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

  return (
    <section
      aria-label={typeof input.title === "string" ? input.title : undefined}
      data-variant={variant}
      role="dialog"
    >
      <h2>{input.title}</h2>

      {input.description === undefined ? null : <p>{input.description}</p>}

      <button
        type="button"
        onClick={() => {
          close({ confirmed: false, reason: "cancel" });
        }}
      >
        {cancelText}
      </button>

      <button
        type="button"
        onClick={() => {
          close({ confirmed: true });
        }}
      >
        {confirmText}
      </button>

      {input.dismissible === false ? null : (
        <button
          aria-label="Dismiss"
          type="button"
          onClick={() => {
            close({ confirmed: false, reason: "dismiss" });
          }}
        >
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
