"use client";

import { isDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import * as Dialog from "@radix-ui/react-dialog";
import { useContext, useRef } from "react";
import { DialogFocusContext } from "./DialogFocusContext";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ComponentProps, ReactNode } from "react";

export function DialogSurface(
  props: Omit<ComponentProps<typeof Dialog.Content>, "onCloseAutoFocus">,
): ReactNode {
  const { onOpenAutoFocus, ...contentProps } = props;
  const returnFocusId = useContext(DialogFocusContext);
  const opener = useRef<Nullable<HTMLElement>>(null);

  function handleOpenAutoFocus(event: Event): void {
    if (isInstanceOf(document.activeElement, HTMLElement)) {
      opener.current = document.activeElement;
    }

    onOpenAutoFocus?.(event);
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

  return (
    <Dialog.Content
      className="dialog"
      {...contentProps}
      onOpenAutoFocus={handleOpenAutoFocus}
      onCloseAutoFocus={handleCloseAutoFocus}
    />
  );
}
