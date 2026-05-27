import { createStoreToolkit } from "@okyrychenko-dev/react-zustand-toolkit";
import { MODAL_STORE_DEFAULTS } from "./modalStore.constants";
import type { ModalInstanceId } from "../types";
import type { ModalStore } from "./modalStore.types";

export const modalStoreToolkit = createStoreToolkit<ModalStore>(
  (set, get) => {
    const removeTimerIds = new Map<
      ModalInstanceId,
      ReturnType<typeof globalThis.setTimeout>
    >();

    const clearRemoveTimer = (instanceId: ModalInstanceId): void => {
      const timerId = removeTimerIds.get(instanceId);

      if (timerId === undefined) {
        return;
      }

      globalThis.clearTimeout(timerId);
      removeTimerIds.delete(instanceId);
    };

    return {
      ...MODAL_STORE_DEFAULTS,
      addModal: (modal) => {
        set((state) => ({
          modals: [...state.modals, { ...modal, status: "open" }],
        }));
      },
      allocateInstanceId: () => {
        const { nextInstanceIndex } = get();

        set({
          nextInstanceIndex: nextInstanceIndex + 1,
        });

        return `modal-${String(nextInstanceIndex)}`;
      },
      dismissAll: (reason) => {
        for (const modal of get().modals.filter(
          (item) => item.status === "open",
        )) {
          modal.dismiss(reason);
        }

        set((state) => ({
          modals: state.modals.map((modal) => ({
            ...modal,
            status: "closing",
          })),
        }));
      },
      markModalClosing: (instanceId) => {
        set((state) => ({
          modals: state.modals.map((modal) =>
            modal.instanceId === instanceId
              ? {
                  ...modal,
                  status: "closing",
                }
              : modal,
          ),
        }));
      },
      scheduleRemove: (instanceId, delayMs) => {
        clearRemoveTimer(instanceId);

        if (delayMs <= 0) {
          get().removeModal(instanceId);
          return;
        }

        const timerId = globalThis.setTimeout(() => {
          removeTimerIds.delete(instanceId);
          get().removeModal(instanceId);
        }, delayMs);

        removeTimerIds.set(instanceId, timerId);
      },
      removeModal: (instanceId) => {
        clearRemoveTimer(instanceId);

        set((state) => ({
          modals: state.modals.filter(
            (modal) => modal.instanceId !== instanceId,
          ),
        }));
      },
      clearModals: () => {
        get().clearRemoveTimers();

        set({
          modals: [],
        });
      },
      clearRemoveTimers: () => {
        for (const timerId of removeTimerIds.values()) {
          globalThis.clearTimeout(timerId);
        }

        removeTimerIds.clear();
      },
    };
  },
  {
    name: "ModalManager",
  },
);

export const {
  useContextStore: useModalStore,
  useContextStoreApi: useModalStoreApi,
} = modalStoreToolkit.provider;

export const { Provider: ModalStoreProvider } = modalStoreToolkit.provider;
