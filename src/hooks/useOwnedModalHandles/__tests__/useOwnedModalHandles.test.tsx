import { assertDefined } from "@okyrychenko-dev/type-utils";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalDismissError } from "../../../errors";
import { ModalProvider } from "../../../provider";
import { createModal, createModalRegistry } from "../../../registry";
import { useOwnedModalHandles } from "../useOwnedModalHandles";
import { OwnedEffectLauncher } from "./OwnedEffectLauncher";
import { RejectOwnedModal } from "./RejectOwnedModal";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type { ConfirmModalResult } from "../../../confirm";
import type { ModalHandle } from "../../useModalManager";

describe("useOwnedModalHandles", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("should preserve confirmation results through the public ownership interface", async () => {
    const registry = createModalRegistry({});

    render(<ModalProvider registry={registry}>{null}</ModalProvider>);

    const { result } = renderHook(useOwnedModalHandles);
    let handle: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      handle = registry.confirm({ title: "Owned confirmation" });
    });

    assertDefined(handle);

    const tracked = result.current.track(handle);

    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/ }));

    await expect(tracked).resolves.toEqual({ confirmed: true });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should immediately dismiss a handle tracked after owner cleanup", async () => {
    const registry = createModalRegistry({});

    render(<ModalProvider registry={registry}>{null}</ModalProvider>);

    const { result, unmount } = renderHook(useOwnedModalHandles);
    const owner = result.current;

    unmount();

    let handle: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      handle = registry.confirm({ title: "Late operation" });
    });

    assertDefined(handle);

    const opened = handle;
    let tracked: Optional<Promise<ConfirmModalResult>>;

    act(() => {
      tracked = owner.track(opened);
      void tracked.catch(() => undefined);
    });

    assertDefined(tracked);

    expect(screen.queryByRole("dialog")).toBeNull();

    await expect(tracked).rejects.toMatchObject({ reason: "dismiss" });
  });

  it("should dismiss concurrent owned handles without affecting another provider with overlapping ids", async () => {
    const first = createModalRegistry({});
    const second = createModalRegistry({});

    render(
      <>
        <ModalProvider registry={first}>{null}</ModalProvider>
        <ModalProvider registry={second}>{null}</ModalProvider>
      </>,
    );

    const { result, unmount } = renderHook(useOwnedModalHandles);
    const owned: Array<ModalHandle<ConfirmModalResult>> = [];
    let neighbor: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      owned.push(
        first.confirm({ title: "First" }),
        first.confirm({ title: "Second" }),
      );
      neighbor = second.confirm({ title: "Neighbor" });
    });

    assertDefined(neighbor);

    expect(owned[0]?.instanceId).toBe(neighbor.instanceId);

    const outcomes = owned.map((handle) =>
      result.current.track(handle).catch((error: unknown) => error),
    );

    unmount();

    expect(await Promise.all(outcomes)).toEqual([
      new ModalDismissError("dismiss"),
      new ModalDismissError("dismiss"),
    ]);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Neighbor" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await expect(neighbor).resolves.toEqual({
      confirmed: false,
      reason: "cancel",
    });
  });

  it("should allow repeated explicit dismissal and remain usable for later work", async () => {
    const registry = createModalRegistry({});

    render(<ModalProvider registry={registry}>{null}</ModalProvider>);

    const { result } = renderHook(useOwnedModalHandles);
    let handle: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      handle = registry.confirm({ title: "Dismiss me" });
    });

    assertDefined(handle);

    const rejected = expect(result.current.track(handle)).rejects.toEqual(
      new ModalDismissError("dismiss"),
    );
    const stillActive = result.current.captureLifetime();

    act(() => {
      result.current.dismissAll();
      result.current.dismissAll();
    });

    await rejected;

    expect(stillActive()).toBe(true);

    act(() => {
      handle = registry.confirm({ title: "New work" });
    });

    assertDefined(handle);

    const tracked = result.current.track(handle);

    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/ }));

    await expect(tracked).resolves.toEqual({ confirmed: true });
  });

  it("should preserve explicit rejection errors", async () => {
    const failure = new Error("Cannot save");
    const registry = createModalRegistry({
      operation: createModal<Error, string>({ component: RejectOwnedModal }),
    });

    render(<ModalProvider registry={registry}>{null}</ModalProvider>);

    const { result } = renderHook(useOwnedModalHandles);
    let handle: Optional<ModalHandle<string>>;

    act(() => {
      handle = registry.open("operation", failure);
    });

    assertDefined(handle);

    const rejected = expect(result.current.track(handle)).rejects.toBe(failure);

    fireEvent.click(screen.getByRole("button", { name: "Reject operation" }));

    await rejected;
  });

  it("should preserve lifecycle removal waiting separately from tracked result settlement", async () => {
    vi.useFakeTimers();

    const registry = createModalRegistry({});

    render(
      <ModalProvider registry={registry} closeDelayMs={200}>
        {null}
      </ModalProvider>,
    );

    const { result } = renderHook(useOwnedModalHandles);
    let handle: Optional<ModalHandle<ConfirmModalResult>>;

    act(() => {
      handle = registry.confirm({ title: "Delayed removal" });
    });

    assertDefined(handle);

    const tracked = result.current.track(handle);
    const removed = vi.fn();
    const removal = handle.whenRemoved().then(removed);

    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/ }));

    await expect(tracked).resolves.toEqual({ confirmed: true });

    act(() => {
      result.current.dismissAll();
    });

    expect(removed).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await removal;

    expect(removed).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should keep its interface stable on rerender and invalidate captured guards permanently on unmount", () => {
    const { result, rerender, unmount } = renderHook(useOwnedModalHandles);
    const owner = result.current;
    const isActive = owner.captureLifetime();

    expect(isActive()).toBe(true);

    rerender();

    expect(result.current).toBe(owner);
    expect(isActive()).toBe(true);

    unmount();

    expect(isActive()).toBe(false);
    expect(owner.captureLifetime()()).toBe(false);
  });

  it("should support passive-effect opening through Strict Mode replay without delivering stale outcomes", async () => {
    const onOutcome = vi.fn();

    render(
      <StrictMode>
        <ModalProvider>
          <OwnedEffectLauncher onOutcome={onOutcome} />
        </ModalProvider>
      </StrictMode>,
    );

    await act(async () => undefined);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onOutcome).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Confirm$/ }));

    await act(async () => undefined);

    expect(onOutcome).toHaveBeenCalledExactlyOnceWith({ confirmed: true });
  });

  it("should server render without opening operations or requiring a document", () => {
    const onOutcome = vi.fn();
    const markup = renderToString(
      <ModalProvider>
        <OwnedEffectLauncher onOutcome={onOutcome} />
      </ModalProvider>,
    );

    expect(markup).toBe("<span>Effect launcher</span>");
    expect(onOutcome).not.toHaveBeenCalled();
  });
});
