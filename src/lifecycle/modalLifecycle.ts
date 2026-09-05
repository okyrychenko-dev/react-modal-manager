import { isError } from "@okyrychenko-dev/type-utils";
import { createElement } from "react";
import { ModalDismissError, ModalRejectError } from "../errors";
import type {
  ModalDefinition,
  ModalDismissReason,
  ModalInstanceId,
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

  const removalTimers = new Map<
    ModalInstanceId,
    ReturnType<typeof globalThis.setTimeout>
  >();
  const dismissers = new Map<
    ModalInstanceId,
    (reason?: ModalDismissReason) => void
  >();

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

    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
      removalTimers.delete(instanceId);
    }

    dismissers.delete(instanceId);

    instances = instances.filter(
      (candidate) => candidate.instanceId !== instanceId,
    );
    publishState();
  };

  const settleInstance = (
    instanceId: ModalInstanceId,
    settle: VoidFunction,
  ): void => {
    const instance = instances.find(
      (candidate) => candidate.instanceId === instanceId,
    );

    if (instance === undefined || instance.status === "closing") {
      return;
    }

    instances = instances.map((candidate): ModalLifecycleInstance => {
      if (candidate.instanceId === instanceId) {
        return { ...candidate, status: "closing" };
      }

      return candidate;
    });
    publishState();
    settle();

    if (closeDelayMs <= 0) {
      removeInstance(instanceId);
      return;
    }

    const timer = globalThis.setTimeout(() => {
      removeInstance(instanceId);
    }, closeDelayMs);
    removalTimers.set(instanceId, timer);
  };

  const dismissOpenInstances = (reason: ModalDismissReason): void => {
    const openInstanceIds = instances
      .filter((instance) => instance.status === "open")
      .map((instance) => instance.instanceId);

    for (const instanceId of openInstanceIds) {
      dismissers.get(instanceId)?.(reason);
    }
  };

  return {
    closeAll: (reason = "close-all") => {
      dismissOpenInstances(reason);
    },
    dispose: () => {
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
    },
    dismiss: (instanceId, reason) => {
      dismissers.get(instanceId)?.(reason);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    open: <TInput, TResult>(
      modal: ModalDefinition<TInput, TResult>,
      input: TInput,
    ): ModalLifecycleHandle<TResult> => {
      const instanceId = `modal-${String(nextInstanceIndex)}`;
      nextInstanceIndex += 1;

      if (disposed) {
        const result = Promise.reject<TResult>(
          new ModalDismissError("provider-unmount"),
        );

        return Object.assign(result, {
          dismiss: () => undefined,
          instanceId,
        });
      }

      const result = new Promise<TResult>((resolve, reject) => {
        const dismiss = (reason: ModalDismissReason = "dismiss"): void => {
          settleInstance(instanceId, () => {
            reject(new ModalDismissError(reason));
          });
        };
        dismissers.set(instanceId, dismiss);

        const instance: ModalLifecycleInstance = {
          definitionId: modal.id,
          instanceId,
          render: () =>
            createElement(modal.component, {
              close: (modalResult) => {
                settleInstance(instanceId, () => {
                  resolve(modalResult);
                });
              },
              dismiss,
              input,
              instanceId,
              reject: (error) => {
                settleInstance(instanceId, () => {
                  reject(isError(error) ? error : new ModalRejectError(error));
                });
              },
            }),
          status: "open",
        };

        instances = [...instances, instance];
        publishState();
      });

      return Object.assign(result, {
        dismiss: (reason?: ModalDismissReason) => {
          dismissers.get(instanceId)?.(reason);
        },
        instanceId,
      });
    },
    setCloseDelayMs: (nextCloseDelayMs: number): void => {
      closeDelayMs = nextCloseDelayMs;
    },
    subscribe: (observer): VoidFunction => {
      if (disposed) {
        return () => undefined;
      }

      observers.add(observer);

      return () => {
        observers.delete(observer);
      };
    },
  };
}
