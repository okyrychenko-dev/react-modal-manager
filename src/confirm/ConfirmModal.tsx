import { useEffect, useId, useRef } from "react";
import {
  DEFAULT_CANCEL_TEXT,
  DEFAULT_CONFIRM_TEXT,
} from "./ConfirmModal.constants";
import { getFocusableElements } from "./ConfirmModal.utils";
import type { KeyboardEvent, ReactNode } from "react";
import type { ModalComponentProps } from "../types";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "./ConfirmModal.types";

export function ConfirmModal(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
): ReactNode {
  const { close, input } = props;

  const cancelText = input.cancelText ?? DEFAULT_CANCEL_TEXT;
  const confirmText = input.confirmText ?? DEFAULT_CONFIRM_TEXT;
  const variant = input.variant ?? "default";
  const dismissible = input.dismissible !== false;
  const hasDescription = input.description !== undefined;
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;

    // Destructive confirms focus the safe action so an accidental Enter does not confirm.
    let initialFocusRef = confirmButtonRef;

    if (variant === "danger") {
      initialFocusRef = cancelButtonRef;
    }

    initialFocusRef.current?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [variant]);

  const handleCancel = (): void => {
    close({ confirmed: false, reason: "cancel" });
  };

  const handleConfirm = (): void => {
    close({ confirmed: true });
  };

  const handleDismiss = (): void => {
    close({ confirmed: false, reason: "dismiss" });
  };

  const handleEscape = (event: KeyboardEvent<HTMLElement>): void => {
    if (!dismissible) {
      return;
    }

    event.preventDefault();
    handleDismiss();
  };

  const handleTab = (event: KeyboardEvent<HTMLElement>): void => {
    if (dialogRef.current === null) {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      handleEscape(event);
      return;
    }

    if (event.key === "Tab") {
      handleTab(event);
    }
  };

  let describedBy: string | undefined;

  if (hasDescription) {
    describedBy = descriptionId;
  }

  return (
    <section
      aria-describedby={describedBy}
      aria-labelledby={titleId}
      aria-modal="true"
      data-variant={variant}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <h2 id={titleId}>{input.title}</h2>

      {hasDescription && <p id={descriptionId}>{input.description}</p>}

      <button ref={cancelButtonRef} type="button" onClick={handleCancel}>
        {cancelText}
      </button>

      <button ref={confirmButtonRef} type="button" onClick={handleConfirm}>
        {confirmText}
      </button>

      {dismissible && (
        <button aria-label="Dismiss" type="button" onClick={handleDismiss}>
          Dismiss
        </button>
      )}
    </section>
  );
}
