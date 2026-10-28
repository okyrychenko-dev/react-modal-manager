import { assertDefined } from "@okyrychenko-dev/type-utils";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, Suspense } from "react";
import { describe, expect, it } from "vitest";
import { createModalRegistry } from "../../registry";
import { ModalProvider } from "../ModalProvider";
import { customConfirmModal } from "./ModalProvider.fixtures";
import { RegistryEffectOpener } from "./RegistryEffectOpener";
import { SuspenseGate } from "./SuspenseGate";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ConfirmModalResult } from "../../confirm";
import type { ModalHandle } from "../../hooks";

describe("ModalProvider effect readiness", () => {
  it("should preserve operations and viewport subscriptions through Suspense", async () => {
    const registry = createModalRegistry({});
    const loading = <p>Loading</p>;

    const application = (suspend: boolean) => (
      <Suspense fallback={loading}>
        <ModalProvider registry={registry}>
          <SuspenseGate suspend={suspend} />
        </ModalProvider>
      </Suspense>
    );

    const { rerender, unmount } = render(application(false));

    let before: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      before = registry.confirm({ title: "Before suspension" });
      void before.catch(() => undefined);
    });

    assertDefined(before);

    expect(
      screen.getByRole("dialog", { name: "Before suspension" }),
    ).toBeInTheDocument();

    rerender(application(true));

    await act(async () => undefined);

    expect(screen.getByText("Loading")).toBeInTheDocument();

    rerender(application(false));

    await act(async () => undefined);

    expect(
      screen.getByRole("dialog", { name: "Before suspension" }),
    ).toBeInTheDocument();

    let after: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      after = registry.confirm({ title: "After suspension" });
      void after.catch(() => undefined);
    });

    assertDefined(after);

    expect(
      screen.getByRole("dialog", { name: "After suspension" }),
    ).toBeInTheDocument();

    act(() => before?.dismiss());

    await expect(before).rejects.toMatchObject({ reason: "dismiss" });

    expect(
      screen.queryByRole("dialog", { name: "Before suspension" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "After suspension" }),
    ).toBeInTheDocument();

    unmount();

    await expect(after).rejects.toMatchObject({ reason: "provider-unmount" });
    await expect(after.whenRemoved()).resolves.toBeUndefined();
  });

  it.each([false, true])(
    "should preserve shared nested binding precedence and fallback (Strict Mode: %s)",
    async (strict) => {
      const registry = createModalRegistry({});
      const handles: Array<ModalHandle<ConfirmModalResult>> = [];

      const onOpen = (handle: ModalHandle<ConfirmModalResult>): void => {
        handles.push(handle);
      };

      const application = (nested: boolean) => {
        const content = (
          <ModalProvider registry={registry} confirmModal={customConfirmModal}>
            {nested && (
              <ModalProvider registry={registry}>
                <RegistryEffectOpener registry={registry} onOpen={onOpen} />
              </ModalProvider>
            )}
          </ModalProvider>
        );
        return strict ? <StrictMode>{content}</StrictMode> : content;
      };

      const { rerender, unmount } = render(application(true));

      // The trailing outer binder attaches last on a simultaneous nested mount.
      expect(
        screen.getAllByRole("dialog", { name: "Custom confirm" }),
      ).toHaveLength(handles.length);

      const initialCount = handles.length;

      rerender(application(false));

      expect(registry.isReady()).toBe(true);

      // A later nested attachment now owns routing, without migrating old handles.
      rerender(application(true));

      expect(
        screen.getAllByRole("dialog", { name: "Effect confirmation" }),
      ).toHaveLength(initialCount);

      const original = handles[0];

      assertDefined(original);

      act(() => original.dismiss());

      await expect(original).rejects.toMatchObject({ reason: "dismiss" });

      expect(
        screen.getAllByRole("dialog", { name: "Effect confirmation" }),
      ).toHaveLength(initialCount);

      rerender(application(false));

      await act(async () => undefined);

      let fallback: Optional<ModalHandle<ConfirmModalResult>>;

      act(() => {
        fallback = registry.confirm({ title: "Fallback" });
      });

      const cancels = screen.getAllByRole("button", { name: "Custom cancel" });
      const cancel = cancels[cancels.length - 1];

      assertDefined(cancel);

      fireEvent.click(cancel);

      await expect(fallback).resolves.toEqual({
        confirmed: false,
        reason: "cancel",
      });

      unmount();

      await act(async () => undefined);

      expect(registry.isReady()).toBe(false);
    },
  );

  it("should open through independent registries in descendant mount effects", async () => {
    const first = createModalRegistry({});
    const second = createModalRegistry({});

    const handles: Array<ModalHandle<ConfirmModalResult>> = [];

    const onOpen = (handle: ModalHandle<ConfirmModalResult>): void => {
      handles.push(handle);
    };

    const { unmount } = render(
      <ModalProvider registry={first} confirmModal={customConfirmModal}>
        <RegistryEffectOpener registry={first} onOpen={onOpen} />
        <ModalProvider registry={second}>
          <RegistryEffectOpener registry={second} onOpen={onOpen} />
        </ModalProvider>
      </ModalProvider>,
    );

    expect(
      screen.getByRole("dialog", { name: "Custom confirm" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Effect confirmation" }),
    ).toBeInTheDocument();

    unmount();

    await act(async () => undefined);

    for (const handle of handles) {
      await expect(handle).rejects.toMatchObject({
        reason: "provider-unmount",
      });
    }
  });

  it.each([false, true])(
    "should open from a descendant mount effect (Strict Mode: %s)",
    async (strict) => {
      const registry = createModalRegistry({});

      const handles: Array<ModalHandle<ConfirmModalResult>> = [];

      const onOpen = (handle: ModalHandle<ConfirmModalResult>): void => {
        handles.push(handle);
      };

      const application = (
        <ModalProvider registry={registry}>
          <RegistryEffectOpener registry={registry} onOpen={onOpen} />
        </ModalProvider>
      );
      const { unmount } = render(
        strict ? <StrictMode>{application}</StrictMode> : application,
      );

      await act(async () => undefined);

      expect(screen.getAllByRole("dialog")).toHaveLength(handles.length);
      expect(handles.length).toBeGreaterThan(0);

      unmount();

      await act(async () => undefined);

      for (const handle of handles) {
        await expect(handle).rejects.toMatchObject({
          reason: "provider-unmount",
        });
        await expect(handle.whenRemoved()).resolves.toBeUndefined();
      }

      expect(registry.isReady()).toBe(false);
    },
  );
});
