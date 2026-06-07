import { CONFIRM_MODAL_FOCUSABLE_SELECTOR } from "./ConfirmModal.constants";

export function getFocusableElements(
  container: HTMLElement,
): Array<HTMLElement> {
  return Array.from(
    container.querySelectorAll<HTMLElement>(CONFIRM_MODAL_FOCUSABLE_SELECTOR),
  );
}
