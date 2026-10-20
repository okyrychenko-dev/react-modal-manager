import {
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import { assertDefined } from "@okyrychenko-dev/type-utils";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationButton } from "../ConfirmationButton";
import { portableConfirmation } from "../portable-confirmation.constants";
import { PortableDialogRenderer } from "../PortableDialogRenderer";
import { PortableReactExample } from "../PortableReactExample";
import type { Optional } from "@okyrychenko-dev/type-utils";

describe("portable React confirmation", () => {
  afterEach(() => vi.useRealTimers());
  it("should render one dialog and show typed Confirm and Cancel outcomes", async () => {
    render(<PortableReactExample />);
    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    expect(await screen.findAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Confirmed"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Cancelled: cancel"),
    );
  });

  it("should report Escape dismissal and restore focus to the launcher", async () => {
    render(<PortableReactExample />);
    const launcher = screen.getByRole("button", { name: "Open confirmation" });
    launcher.focus();
    fireEvent.click(launcher);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Confirm" }),
      ),
    );
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Dismissed: dismiss"),
    );
    await waitFor(() => expect(document.activeElement).toBe(launcher));
  });

  it("should keep dangerous required decisions open on Escape while allowing Cancel", async () => {
    const registry = createModalRegistry({});
    render(
      <ModalProvider
        registry={registry}
        renderer={PortableDialogRenderer}
        confirmModal={portableConfirmation}
      >
        <ConfirmationButton />
      </ModalProvider>,
    );
    let handle: Optional<ReturnType<typeof registry.confirm>>;
    act(() => {
      handle = registry.confirm({
        title: "Required decision",
        dismissible: false,
        variant: "danger",
      });
    });
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      ),
    );
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBe(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    assertDefined(handle);
    await expect(handle).resolves.toEqual({
      confirmed: false,
      reason: "cancel",
    });
  });

  it.each([true, false])(
    "should respect dismissible=%s for outside interaction and allow owner dismissal",
    async (dismissible) => {
      const registry = createModalRegistry({});
      render(
        <ModalProvider
          registry={registry}
          renderer={PortableDialogRenderer}
          confirmModal={portableConfirmation}
        >
          <ConfirmationButton />
        </ModalProvider>,
      );
      let handle: Optional<ReturnType<typeof registry.confirm>>;
      vi.useFakeTimers();
      act(() => {
        handle = registry.confirm({ title: "Outside decision", dismissible });
      });
      // Flush deferred dialog activation before sending an outside pointer event.
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      vi.useRealTimers();
      await screen.findByRole("dialog");
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: "Confirm" }),
        ),
      );
      assertDefined(handle);
      const rejected = expect(handle).rejects.toMatchObject({
        reason: "dismiss",
      });

      fireEvent.pointerDown(document.body, { pointerType: "mouse", button: 0 });
      fireEvent.pointerUp(document.body, { pointerType: "mouse", button: 0 });
      fireEvent.click(document.body);
      if (!dismissible) {
        expect(screen.getByRole("dialog")).toBeDefined();
        const ownedHandle = handle;
        act(() => ownedHandle.dismiss());
      }
      await rejected;
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    },
  );
});
