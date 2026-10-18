import { isDefined, isInstanceOf } from "@okyrychenko-dev/type-utils";
import { getFocusableElements } from "./ConfirmModal.utils";
import type { Nullable } from "@okyrychenko-dev/type-utils";
import type { ConfirmFocusEntry } from "./confirmFocus.types";

// Presentation ownership follows the document, including independent React roots.
const stacks = new WeakMap<Document, Array<ConfirmFocusEntry>>();

function canRestoreFocus(element: Nullable<Element>): element is HTMLElement {
  return (
    isInstanceOf(element, HTMLElement) &&
    element.isConnected &&
    !element.matches(":disabled, [hidden], [inert]") &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]')
  );
}

export function registerConfirmFocus(dialog: HTMLElement): VoidFunction {
  const document = dialog.ownerDocument;
  let stack = stacks.get(document);
  if (!isDefined(stack)) {
    stack = [];
    stacks.set(document, stack);
  }
  const entries = stack;
  const entry: ConfirmFocusEntry = { dialog, opener: document.activeElement };
  entries.push(entry);

  return () => {
    const index = entries.indexOf(entry);
    const wasTop = index === entries.length - 1;
    entries.splice(index, 1);
    // Keep the return path alive when a lower dialog disappears first.
    for (const remaining of entries) {
      if (dialog.contains(remaining.opener)) {
        remaining.opener = entry.opener;
      }
    }
    if (!wasTop) {
      return;
    }
    const active = document.activeElement;
    if (
      active !== document.body &&
      active?.isConnected &&
      !dialog.contains(active)
    ) {
      return;
    }
    const top = entries[entries.length - 1];
    if (
      canRestoreFocus(entry.opener) &&
      (!isDefined(top) || top.dialog.contains(entry.opener))
    ) {
      entry.opener.focus();
      if (document.activeElement === entry.opener) {
        return;
      }
    }
    if (isDefined(top)) {
      for (const target of getFocusableElements(top.dialog).filter(
        canRestoreFocus,
      )) {
        target.focus();
        if (document.activeElement === target) {
          return;
        }
      }
    }
  };
}
