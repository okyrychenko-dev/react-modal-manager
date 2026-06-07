import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmModal } from "../ConfirmModal";
import type { ModalComponentProps } from "../../types";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "../ConfirmModal.types";

type ConfirmModalProps = ModalComponentProps<
  ConfirmModalParams,
  ConfirmModalResult
>;

function renderConfirmModal(
  input: ConfirmModalParams,
  overrides?: Partial<ConfirmModalProps>,
): { close: ConfirmModalProps["close"] } {
  const close = vi.fn();

  render(
    <ConfirmModal
      close={close}
      dismiss={vi.fn()}
      input={input}
      instanceId="confirm-test"
      reject={vi.fn()}
      {...overrides}
    />,
  );

  return { close };
}

describe("ConfirmModal a11y", () => {
  it("should mark the dialog as modal and describe it by its description", () => {
    renderConfirmModal({ title: "Delete?", description: "No undo." });

    const dialog = screen.getByRole("dialog", { name: "Delete?" });

    expect(dialog).toHaveAttribute("aria-modal", "true");

    const description = screen.getByText("No undo.");

    expect(dialog).toHaveAttribute("aria-describedby", description.id);
  });

  it("should not set aria-describedby without a description", () => {
    renderConfirmModal({ title: "Delete?" });

    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-describedby");
  });

  it("should focus the confirm button on mount", () => {
    renderConfirmModal({ title: "Delete?", confirmText: "Delete" });

    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("should focus the cancel button on mount for the danger variant", () => {
    renderConfirmModal({
      title: "Delete?",
      cancelText: "Keep",
      confirmText: "Delete",
      variant: "danger",
    });

    expect(screen.getByRole("button", { name: "Keep" })).toHaveFocus();
  });

  it("should dismiss on Escape when dismissible", () => {
    const { close } = renderConfirmModal({ title: "Delete?" });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(close).toHaveBeenCalledWith({ confirmed: false, reason: "dismiss" });
  });

  it("should ignore Escape when not dismissible", () => {
    const { close } = renderConfirmModal({
      title: "Locked?",
      dismissible: false,
    });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(close).not.toHaveBeenCalled();
  });

  it("should trap Tab focus within the dialog", () => {
    renderConfirmModal({
      title: "Delete?",
      cancelText: "Cancel",
      confirmText: "Delete",
      dismissible: false,
    });

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Delete" });

    confirm.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(cancel).toHaveFocus();

    cancel.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(confirm).toHaveFocus();
  });
});
