import { isDefined, isError } from "@okyrychenko-dev/type-utils";
import { createElement } from "react";
import { ModalDismissError, ModalRejectError } from "../errors";
import type { Optional } from "@okyrychenko-dev/type-utils";
import type {
  ModalComponentProps,
  ModalDefinition,
  ModalDismissReason,
  ModalInstanceId,
  ModalOpenArgs,
} from "../types";
import type {
  CreateModalLifecycleOptions,
  ModalLifecycle,
  ModalLifecycleHandle,
  ModalLifecycleInstance,
  ModalLifecycleState,
} from "./modalLifecycle.types";

export function createModalLifecycle(
  options: CreateModalLifecycleOptions,
): ModalLifecycle {
  let nextInstanceIndex = 0;
  let instances: Array<ModalLifecycleInstance> = [];
  let disposed = false;
  let closeDelayMs = options.closeDelayMs;
  const serverSnapshot: ModalLifecycleState = { instances: [] };
  let snapshot = serverSnapshot;

  const observers = new Set<VoidFunction>();
  const removalWaiters = new Map<ModalInstanceId, VoidFunction>();

  const removalTimers = new Map<
    ModalInstanceId,
    ReturnType<typeof globalThis.setTimeout>
  >();
  const dismissers = new Map<
    ModalInstanceId,
    (reason?: ModalDismissReason) => void
  >();

  const ignore: VoidFunction = () => undefined;

  const notifyObservers = (): void => {
    for (const observer of observers) {
      observer();
    }
  };

  const publishState = (): void => {
    if (disposed) {
      return;
    }

    snapshot = { instances: [...instances] };
    notifyObservers();
  };

  const removeInstance = (instanceId: ModalInstanceId): void => {
    const timer = removalTimers.get(instanceId);

    if (isDefined(timer)) {
      globalThis.clearTimeout(timer);
      removalTimers.delete(instanceId);
    }

    dismissers.delete(instanceId);

    const isOtherInstance = (candidate: ModalLifecycleInstance): boolean => {
      return candidate.instanceId !== instanceId;
    };

    instances = instances.filter(isOtherInstance);

    publishState();

    removalWaiters.get(instanceId)?.();
    removalWaiters.delete(instanceId);
  };

  const settleInstance = (
    instanceId: ModalInstanceId,
    settle: VoidFunction,
  ): void => {
    const isTargetInstance = (candidate: ModalLifecycleInstance): boolean => {
      return candidate.instanceId === instanceId;
    };

    const instance = instances.find(isTargetInstance);

    if (!isDefined(instance) || instance.status === "closing") {
      return;
    }

    const markClosing = (
      candidate: ModalLifecycleInstance,
    ): ModalLifecycleInstance => {
      if (candidate.instanceId === instanceId) {
        return { ...candidate, status: "closing" };
      }

      return candidate;
    };

    instances = instances.map(markClosing);

    publishState();
    settle();

    if (disposed) {
      return;
    }

    if (closeDelayMs <= 0) {
      removeInstance(instanceId);
      return;
    }

    const removeSettledInstance: VoidFunction = () => {
      removeInstance(instanceId);
    };

    const timer = globalThis.setTimeout(removeSettledInstance, closeDelayMs);

    removalTimers.set(instanceId, timer);
  };

  const dismissOpenInstances = (reason: ModalDismissReason): void => {
    const isOpen = (instance: ModalLifecycleInstance): boolean => {
      return instance.status === "open";
    };

    const getInstanceId = (
      instance: ModalLifecycleInstance,
    ): ModalInstanceId => {
      return instance.instanceId;
    };

    const openInstanceIds = instances.filter(isOpen).map(getInstanceId);

    for (const instanceId of openInstanceIds) {
      dismissers.get(instanceId)?.(reason);
    }
  };

  const closeAll: ModalLifecycle["closeAll"] = (reason = "close-all") => {
    dismissOpenInstances(reason);
  };

  const dispose: ModalLifecycle["dispose"] = () => {
    if (disposed) {
      return;
    }

    disposed = true;

    dismissOpenInstances("provider-unmount");

    for (const timer of removalTimers.values()) {
      globalThis.clearTimeout(timer);
    }

    removalTimers.clear();
    dismissers.clear();

    instances = [];
    snapshot = { instances: [] };

    notifyObservers();
    observers.clear();

    for (const resolveRemoval of removalWaiters.values()) {
      resolveRemoval();
    }

    removalWaiters.clear();
  };

  const dismiss: ModalLifecycle["dismiss"] = (instanceId, reason) => {
    dismissers.get(instanceId)?.(reason);
  };

  const getSnapshot: ModalLifecycle["getSnapshot"] = () => {
    return snapshot;
  };

  const getServerSnapshot: ModalLifecycle["getServerSnapshot"] = () => {
    return serverSnapshot;
  };

  const open = <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    ...args: ModalOpenArgs<TInput>
  ): ModalLifecycleHandle<TResult> => {
    const input = args[0];
    const instanceId = `modal-${String(nextInstanceIndex)}`;

    nextInstanceIndex += 1;

    let removal: Optional<Promise<void>>;

    const isTargetInstance = (instance: ModalLifecycleInstance): boolean => {
      return instance.instanceId === instanceId;
    };

    const waitForRemoval = (resolve: VoidFunction): void => {
      if (disposed || !instances.some(isTargetInstance)) {
        resolve();
        return;
      }

      removalWaiters.set(instanceId, resolve);
    };

    const whenRemoved = (): Promise<void> => {
      removal ??= new Promise<void>(waitForRemoval);

      return removal;
    };

    if (disposed) {
      const result = Promise.reject<TResult>(
        new ModalDismissError("provider-unmount"),
      );

      return Object.assign(result, {
        dismiss: ignore,
        instanceId,
        whenRemoved,
      });
    }

    const initializeResult = (
      resolve: (value: TResult | PromiseLike<TResult>) => void,
      rejectResult: (reason: unknown) => void,
    ): void => {
      const dismissModal = (reason: ModalDismissReason = "dismiss"): void => {
        const rejectDismissal: VoidFunction = () => {
          rejectResult(new ModalDismissError(reason));
        };
        settleInstance(instanceId, rejectDismissal);
      };

      dismissers.set(instanceId, dismissModal);

      const close: ModalComponentProps<TInput, TResult>["close"] = (
        modalResult,
      ) => {
        const resolveResult: VoidFunction = () => {
          resolve(modalResult);
        };
        settleInstance(instanceId, resolveResult);
      };

      const reject: ModalComponentProps<TInput, TResult>["reject"] = (
        error,
      ) => {
        const rejectError: VoidFunction = () => {
          rejectResult(isError(error) ? error : new ModalRejectError(error));
        };
        settleInstance(instanceId, rejectError);
      };

      const render: ModalLifecycleInstance["render"] = () => {
        return createElement(modal.component, {
          close,
          dismiss: dismissModal,
          input,
          instanceId,
          reject,
        });
      };

      const instance: ModalLifecycleInstance = {
        definitionId: modal.id,
        instanceId,
        render,
        status: "open",
      };

      instances = [...instances, instance];
      publishState();
    };

    const result = new Promise<TResult>(initializeResult);

    const dismissHandle = (reason?: ModalDismissReason): void => {
      dismiss(instanceId, reason);
    };

    return Object.assign(result, {
      dismiss: dismissHandle,
      instanceId,
      whenRemoved,
    });
  };

  const setCloseDelayMs: ModalLifecycle["setCloseDelayMs"] = (
    nextCloseDelayMs: number,
  ): void => {
    closeDelayMs = nextCloseDelayMs;
  };

  const subscribe: ModalLifecycle["subscribe"] = (observer): VoidFunction => {
    if (disposed) {
      return ignore;
    }

    observers.add(observer);

    const unsubscribe: VoidFunction = () => {
      observers.delete(observer);
    };

    return unsubscribe;
  };

  return {
    // Disposal has already cleared operations, timers and removal waiters.
    // Reconnection keeps the monotonic IDs so old handles cannot target new work.
    resume: () => {
      disposed = false;
    },
    closeAll,
    dispose,
    dismiss,
    getSnapshot,
    getServerSnapshot,
    open,
    setCloseDelayMs,
    subscribe,
  };
}
