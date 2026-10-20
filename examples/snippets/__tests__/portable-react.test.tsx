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
  within,
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

  it("should focus the workspace when the opener has unmounted", async () => {
    const registry = createModalRegistry({});

    const { rerender } = render(
      <ModalProvider
        registry={registry}
        renderer={PortableDialogRenderer}
        confirmModal={portableConfirmation}
      >
        <h1 id="portable-workspace" tabIndex={-1}>
          Workspace
        </h1>
        <button>Original opener</button>
      </ModalProvider>,
    );

    screen.getByRole("button", { name: "Original opener" }).focus();

    let handle: Optional<ReturnType<typeof registry.confirm>>;

    act(() => {
      handle = registry.confirm({ title: "Pending decision" });
    });

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Confirm" }),
      ),
    );

    rerender(
      <ModalProvider
        registry={registry}
        renderer={PortableDialogRenderer}
        confirmModal={portableConfirmation}
      >
        <h1 id="portable-workspace" tabIndex={-1}>
          Workspace
        </h1>
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    assertDefined(handle);

    await handle;
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Workspace" }),
      ),
    );
  });

  it.each(["Lower", "Middle"])(
    "should preserve top dialog focus when the %s dialog in a three-dialog stack is dismissed",
    async (dismissedTitle) => {
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
      let lower: Optional<ReturnType<typeof registry.confirm>>;
      let middle: Optional<ReturnType<typeof registry.confirm>>;
      let upper: Optional<ReturnType<typeof registry.confirm>>;

      act(() => {
        lower = registry.confirm({ title: "Lower decision" });
      });

      const lowerDialog = await screen.findByRole("dialog", {
        name: "Lower decision",
      });

      act(() => {
        middle = registry.confirm({ title: "Middle decision" });
      });
      const middleDialog = await screen.findByRole("dialog", {
        name: "Middle decision",
      });

      act(() => {
        upper = registry.confirm({ title: "Upper decision" });
      });

      const dialog = await screen.findByRole("dialog", {
        name: "Upper decision",
      });
      const confirm = within(dialog).getByRole("button", { name: "Confirm" });

      await waitFor(() => expect(document.activeElement).toBe(confirm));

      assertDefined(lower);
      assertDefined(middle);
      assertDefined(upper);

      let lowerReason = "close-all";
      let middleReason = "dismiss";

      if (dismissedTitle === "Lower") {
        lowerReason = "dismiss";
        middleReason = "close-all";
      }

      const lowerDismissed = expect(lower).rejects.toMatchObject({
        reason: lowerReason,
      });
      const middleDismissed = expect(middle).rejects.toMatchObject({
        reason: middleReason,
      });

      const dismissedHandle = dismissedTitle === "Lower" ? lower : middle;
      const remainingDialog =
        dismissedTitle === "Lower" ? middleDialog : lowerDialog;

      const unexpectedFocus = vi.fn();

      remainingDialog.addEventListener("focus", unexpectedFocus);

      vi.useFakeTimers();

      act(() => dismissedHandle.dismiss());

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      vi.useRealTimers();

      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", {
            name: `${dismissedTitle} decision`,
            hidden: true,
          }),
        ).toBeNull(),
      );

      const focusedElement = document.activeElement;
      remainingDialog.removeEventListener("focus", unexpectedFocus);

      fireEvent.click(confirm);

      await expect(upper).resolves.toEqual({ confirmed: true });

      act(() => registry.closeAll());

      await Promise.all([lowerDismissed, middleDismissed]);

      expect(unexpectedFocus).not.toHaveBeenCalled();
      expect(focusedElement).toBe(confirm);
    },
  );

  it("should restore focus to the topmost remaining dialog after the focused dialog is removed", async () => {
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

    const handles: Array<ReturnType<typeof registry.confirm>> = [];
    const outcomes: Array<Promise<unknown>> = [];
    const dialogs: Array<HTMLElement> = [];

    for (const title of [
      "Lower decision",
      "Middle decision",
      "Upper decision",
    ]) {
      act(() => {
        const handle = registry.confirm({ title });
        handles.push(handle);
        outcomes.push(handle.catch((error: unknown) => error));
      });

      const dialog = await screen.findByRole("dialog", { name: title });

      dialogs.push(dialog);

      await waitFor(() =>
        expect(dialog.contains(document.activeElement)).toBe(true),
      );
    }

    const upper = handles[2];
    const lowerDialog = dialogs[0];

    assertDefined(upper);
    assertDefined(lowerDialog);

    const unexpectedFocus = vi.fn();

    lowerDialog.addEventListener("focus", unexpectedFocus);

    vi.useFakeTimers();

    act(() => upper.dismiss());

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    vi.useRealTimers();

    const middle = screen.getByRole("dialog", { name: "Middle decision" });
    const restoredFocus = document.activeElement;

    lowerDialog.removeEventListener("focus", unexpectedFocus);

    act(() => registry.closeAll());

    await Promise.all(outcomes);

    expect(unexpectedFocus).not.toHaveBeenCalled();
    expect(middle.contains(restoredFocus)).toBe(true);
  });
});
