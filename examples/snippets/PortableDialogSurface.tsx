import { isDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ComponentProps, ReactNode } from "react";

export function PortableDialogSurface(
  props: Omit<ComponentProps<typeof Dialog.Content>, "onCloseAutoFocus">,
): ReactNode {
  const { onOpenAutoFocus, ...contentProps } = props;
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
    const openDialogs = document.querySelectorAll(
      '[role="dialog"][data-state="open"]',
    );

    for (const dialog of openDialogs) {
      if (dialog.contains(document.activeElement)) {
        return;
      }
    }

    const topDialog = openDialogs.item(openDialogs.length - 1);

    if (isInstanceOf(topDialog, HTMLElement)) {
      topDialog.focus();
      return;
    }

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

    document.getElementById("portable-workspace")?.focus();
  }

  return (
    <Dialog.Content
      className="portable-dialog"
      {...contentProps}
      onOpenAutoFocus={handleOpenAutoFocus}
      onCloseAutoFocus={handleCloseAutoFocus}
    />
  );
}
