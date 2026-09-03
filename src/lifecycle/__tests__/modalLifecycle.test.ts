import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModalDismissError, ModalRejectError } from "../../errors";
import { createModalLifecycle } from "../modalLifecycle";
import type { ModalComponentProps, ModalDefinition } from "../../types";
import type { ModalLifecycle } from "../modalLifecycle.types";

const testModal: ModalDefinition<{ message: string }, string> = {
  id: "test-modal",
  component: (props: ModalComponentProps<{ message: string }, string>) =>
    createElement(
      "div",
      null,
      createElement(
        "button",
        { onClick: () => props.close(props.input.message) },
        "Close modal",
      ),
      createElement(
        "button",
        { onClick: () => props.dismiss("close-all") },
        "Dismiss modal",
      ),
      createElement(
        "button",
        { onClick: () => props.reject("invalid") },
        "Reject modal",
      ),
    ),
};

describe("modal lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should expose stable snapshots and notify active subscribers", () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });
    const firstObserver = vi.fn();
    const secondObserver = vi.fn();

    expect(lifecycle.getSnapshot()).toBe(lifecycle.getSnapshot());
    expect(lifecycle.getSnapshot()).toBe(lifecycle.getServerSnapshot());

    const unsubscribeFirst = lifecycle.subscribe(firstObserver);
    lifecycle.subscribe(secondObserver);
    lifecycle.open(testModal, { message: "Observed" }).catch(() => undefined);

    expect(firstObserver).toHaveBeenCalledTimes(1);
    expect(secondObserver).toHaveBeenCalledTimes(1);
    expect(lifecycle.getSnapshot().instances).toHaveLength(1);
    expect(lifecycle.getServerSnapshot().instances).toEqual([]);
    expect(lifecycle.getServerSnapshot()).toBe(lifecycle.getServerSnapshot());

    const openedSnapshot = lifecycle.getSnapshot();
    unsubscribeFirst();
    unsubscribeFirst();
    lifecycle.closeAll();

    expect(firstObserver).toHaveBeenCalledTimes(1);
    expect(secondObserver).toHaveBeenCalledTimes(3);
    expect(lifecycle.getSnapshot()).not.toBe(openedSnapshot);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should expose state created before an observer subscribes", () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });
    lifecycle
      .open(testModal, { message: "Already open" })
      .catch(() => undefined);
    const observer = vi.fn();

    lifecycle.subscribe(observer);

    expect(lifecycle.getSnapshot().instances).toEqual([
      expect.objectContaining({ status: "open" }),
    ]);
    expect(observer).not.toHaveBeenCalled();
  });

  it("should allocate unique instance identifiers and publish open state", () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });

    const first = lifecycle.open(testModal, { message: "First" });
    const second = lifecycle.open(testModal, { message: "Second" });

    expect(first.instanceId).toBe("modal-0");
    expect(second.instanceId).toBe("modal-1");
    expect(lifecycle.getSnapshot().instances).toEqual([
      expect.objectContaining({
        definitionId: "test-modal",
        instanceId: "modal-0",
        status: "open",
      }),
      expect.objectContaining({
        definitionId: "test-modal",
        instanceId: "modal-1",
        status: "open",
      }),
    ]);
  });

  it("should resolve an instance and remove it immediately", async () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });

    const result = lifecycle.open(testModal, { message: "Resolved" });
    const [instance] = lifecycle.getSnapshot().instances;

    render(instance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));

    await expect(result).resolves.toBe("Resolved");
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should keep a settled instance closing until its delay expires", async () => {
    vi.useFakeTimers();
    const lifecycle = createModalLifecycle({ closeDelayMs: 100 });

    const result = lifecycle.open(testModal, { message: "First result" });
    const [instance] = lifecycle.getSnapshot().instances;

    render(instance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    result.dismiss("close-all");

    await expect(result).resolves.toBe("First result");
    expect(lifecycle.getSnapshot().instances[0]?.status).toBe("closing");

    await vi.advanceTimersByTimeAsync(99);
    expect(lifecycle.getSnapshot().instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should keep removal timers isolated between instances", async () => {
    vi.useFakeTimers();
    const lifecycle = createModalLifecycle({ closeDelayMs: 100 });
    const first = lifecycle.open(testModal, { message: "First" });
    const second = lifecycle.open(testModal, { message: "Second" });
    const [firstInstance, secondInstance] = lifecycle.getSnapshot().instances;

    const firstRender = render(firstInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    firstRender.unmount();

    await vi.advanceTimersByTimeAsync(50);
    render(secondInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));

    await vi.advanceTimersByTimeAsync(50);
    await expect(first).resolves.toBe("First");
    await expect(second).resolves.toBe("Second");
    expect(
      lifecycle.getSnapshot().instances.map((instance) => instance.instanceId),
    ).toEqual(["modal-1"]);

    await vi.advanceTimersByTimeAsync(50);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should dismiss the targeted instance through the lifecycle or handle", async () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });
    const managed = lifecycle.open(testModal, { message: "Managed" });
    const handled = lifecycle.open(testModal, { message: "Handled" });

    const managedOutcome = managed.catch((error: unknown) => error);
    const handledOutcome = handled.catch((error: unknown) => error);
    const [managedInstance] = lifecycle.getSnapshot().instances;

    render(managedInstance.render());

    lifecycle.dismiss(managed.instanceId, "close-all");
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    handled.dismiss();

    await expect(managedOutcome).resolves.toMatchObject({
      reason: "close-all",
    });
    await expect(handledOutcome).resolves.toMatchObject({ reason: "dismiss" });
    await expect(managedOutcome).resolves.toBeInstanceOf(ModalDismissError);
    await expect(handledOutcome).resolves.toBeInstanceOf(ModalDismissError);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should close all open instances without resettling a closing instance", async () => {
    vi.useFakeTimers();
    const lifecycle = createModalLifecycle({ closeDelayMs: 100 });
    const settled = lifecycle.open(testModal, { message: "Settled" });
    const open = lifecycle.open(testModal, { message: "Open" });
    const openOutcome = open.catch((error: unknown) => error);
    const [settledInstance] = lifecycle.getSnapshot().instances;

    render(settledInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    lifecycle.closeAll("provider-unmount");

    await expect(settled).resolves.toBe("Settled");
    await expect(openOutcome).resolves.toMatchObject({
      reason: "provider-unmount",
    });
    expect(
      lifecycle.getSnapshot().instances.map((instance) => instance.status),
    ).toEqual(["closing", "closing"]);

    await vi.advanceTimersByTimeAsync(100);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should dispose pending work and prevent later state publication", async () => {
    vi.useFakeTimers();
    const publishedStatuses: Array<Array<string>> = [];
    const lifecycle = createModalLifecycle({
      closeDelayMs: 100,
    });
    lifecycle.subscribe(() => {
      publishedStatuses.push(
        lifecycle.getSnapshot().instances.map((instance) => instance.status),
      );
    });
    const closing = lifecycle.open(testModal, { message: "Closing" });
    const pending = lifecycle.open(testModal, { message: "Pending" });
    const pendingOutcome = pending.catch((error: unknown) => error);
    const [closingInstance, pendingInstance] =
      lifecycle.getSnapshot().instances;

    const closingRender = render(closingInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    closingRender.unmount();
    render(pendingInstance.render());
    await expect(closing).resolves.toBe("Closing");

    lifecycle.dispose();
    lifecycle.dispose();
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));

    await expect(pendingOutcome).resolves.toMatchObject({
      reason: "provider-unmount",
    });
    expect(lifecycle.getSnapshot().instances).toEqual([]);
    expect(publishedStatuses[publishedStatuses.length - 1]).toEqual([]);

    const publicationCount = publishedStatuses.length;
    const afterDispose = lifecycle.open(testModal, { message: "Too late" });
    const afterDisposeOutcome = afterDispose.catch((error: unknown) => error);

    expect(lifecycle.getSnapshot().instances).toEqual([]);

    await vi.advanceTimersByTimeAsync(100);
    pending.dismiss();

    await expect(afterDisposeOutcome).resolves.toMatchObject({
      reason: "provider-unmount",
    });
    expect(publishedStatuses).toHaveLength(publicationCount);
  });

  it("should reject a re-entrant open from terminal disposal publication", async () => {
    const lifecycleReference: { current?: ModalLifecycle } = {};
    let reentrantOutcome: Promise<unknown> | undefined;
    let attemptedReentrantOpen = false;
    const reentrantPublications: Array<Array<string>> = [];

    const lifecycle = createModalLifecycle({
      closeDelayMs: 0,
    });
    lifecycleReference.current = lifecycle;
    lifecycle.subscribe(() => {
      const state = lifecycle.getSnapshot();
      if (attemptedReentrantOpen) {
        reentrantPublications.push(
          state.instances.map((instance) => instance.status),
        );
      }

      if (state.instances.length !== 0) {
        return;
      }

      attemptedReentrantOpen = true;
      const handle = lifecycleReference.current?.open(testModal, {
        message: "Too late",
      });
      reentrantOutcome = handle?.catch((error: unknown) => error);
    });
    const pending = lifecycle.open(testModal, { message: "Pending" });
    const pendingOutcome = pending.catch((error: unknown) => error);

    lifecycle.dispose();

    await expect(pendingOutcome).resolves.toMatchObject({
      reason: "provider-unmount",
    });
    await expect(reentrantOutcome).resolves.toMatchObject({
      reason: "provider-unmount",
    });
    expect(reentrantPublications).not.toContainEqual(["open"]);
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });

  it("should preserve Error rejections and wrap non-Error values", async () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 0 });
    const wrapped = lifecycle.open(testModal, { message: "Wrapped" });
    const wrappedOutcome = wrapped.catch((error: unknown) => error);
    const [wrappedInstance] = lifecycle.getSnapshot().instances;

    render(wrappedInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Reject modal" }));

    await expect(wrappedOutcome).resolves.toBeInstanceOf(ModalRejectError);
    await expect(wrappedOutcome).resolves.toMatchObject({ value: "invalid" });

    const expectedError = new Error("Expected failure");
    const errorModal: ModalDefinition<void, never> = {
      id: "error-modal",
      component: (props) =>
        createElement(
          "button",
          { onClick: () => props.reject(expectedError) },
          "Reject with Error",
        ),
    };
    const preserved = lifecycle.open(errorModal, undefined);
    const preservedOutcome = preserved.catch((error: unknown) => error);
    const [preservedInstance] = lifecycle.getSnapshot().instances;

    render(preservedInstance.render());
    fireEvent.click(screen.getByRole("button", { name: "Reject with Error" }));

    await expect(preservedOutcome).resolves.toBe(expectedError);
  });

  it("should ignore every competing settlement after rejection", async () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: 100 });
    const result = lifecycle.open(testModal, { message: "Rejected" });
    const outcome = result.catch((error: unknown) => error);
    const [instance] = lifecycle.getSnapshot().instances;

    render(instance.render());
    fireEvent.click(screen.getByRole("button", { name: "Reject modal" }));
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss modal" }));
    result.dismiss("close-all");
    lifecycle.dismiss(result.instanceId, "provider-unmount");
    lifecycle.closeAll();
    lifecycle.dispose();

    await expect(outcome).resolves.toBeInstanceOf(ModalRejectError);
    await expect(outcome).resolves.toMatchObject({ value: "invalid" });
  });

  it("should use the default close-all reason", async () => {
    const lifecycle = createModalLifecycle({ closeDelayMs: -1 });
    const result = lifecycle.open(testModal, { message: "Pending" });
    const outcome = result.catch((error: unknown) => error);

    lifecycle.closeAll();

    await expect(outcome).resolves.toMatchObject({ reason: "close-all" });
    expect(lifecycle.getSnapshot().instances).toEqual([]);
  });
});
