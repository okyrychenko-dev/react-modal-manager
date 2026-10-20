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

  it("should preserve focus in the upper dialog when a lower dialog is dismissed", async () => {
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
    let upper: Optional<ReturnType<typeof registry.confirm>>;

    act(() => {
      lower = registry.confirm({ title: "Lower decision" });
    });

    await screen.findByRole("dialog", { name: "Lower decision" });

    act(() => {
      upper = registry.confirm({ title: "Upper decision" });
    });

    const dialog = await screen.findByRole("dialog", {
      name: "Upper decision",
    });
    const confirm = within(dialog).getByRole("button", { name: "Confirm" });

    await waitFor(() => expect(document.activeElement).toBe(confirm));

    assertDefined(lower);
    assertDefined(upper);

    const lowerDismissed = expect(lower).rejects.toMatchObject({
      reason: "dismiss",
    });
    const lowerHandle = lower;

    act(() => lowerHandle.dismiss());

    await lowerDismissed;
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Lower decision", hidden: true }),
      ).toBeNull(),
    );

    expect(document.activeElement).toBe(confirm);

    fireEvent.click(confirm);

    await expect(upper).resolves.toEqual({ confirmed: true });
  });
});
