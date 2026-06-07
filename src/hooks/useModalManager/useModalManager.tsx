import { useCallback, useMemo } from "react";
import { ModalDismissError, ModalRejectError } from "../../errors";
import { useModalStoreApi } from "../../store";
import { useModalRuntimeConfig } from "../useModalRuntimeConfig";
import { DEFAULT_DISMISS_REASON } from "./useModalManager.constants";
import type { ModalInstance } from "../../store";
import type {
  ModalDefinition,
  ModalDismissReason,
  ModalInstanceId,
} from "../../types";
import type { ModalHandle, ModalManager } from "./useModalManager.types";

export function useModalManager(): ModalManager {
  const store = useModalStoreApi();
  const { closeDelayMs, confirmModal } = useModalRuntimeConfig();

  const scheduleRemove = useCallback(
    (instanceId: ModalInstanceId) => {
      store.getState().scheduleRemove(instanceId, closeDelayMs);
    },
    [closeDelayMs, store],
  );

  const settleInstance = useCallback(
    (
      instanceId: ModalInstanceId,
      settle: (instance: ModalInstance) => void,
    ) => {
      const instance = store
        .getState()
        .modals.find((modal) => modal.instanceId === instanceId);

      if (instance === undefined || instance.status === "closing") {
        return;
      }

      store.getState().markModalClosing(instanceId);

      settle(instance);
      scheduleRemove(instanceId);
    },
    [scheduleRemove, store],
  );

  const dismiss = useCallback(
    (
      instanceId: ModalInstanceId,
      reason: ModalDismissReason = DEFAULT_DISMISS_REASON,
    ) => {
      settleInstance(instanceId, (instance) => {
        instance.dismiss(reason);
      });
    },
    [settleInstance],
  );

  const closeAll = useCallback(
    (reason?: ModalDismissReason) => {
      const dismissReason = reason ?? "close-all";

      const openInstanceIds = store
        .getState()
        .modals.filter((modal) => modal.status === "open")
        .map((modal) => modal.instanceId);

      store.getState().dismissAll(dismissReason);

      for (const instanceId of openInstanceIds) {
        scheduleRemove(instanceId);
      }
    },
    [scheduleRemove, store],
  );

  const open = useCallback(
    <TInput, TResult>(
      modal: ModalDefinition<TInput, TResult>,
      input: TInput,
    ): ModalHandle<TResult> => {
      const storeState = store.getState();
      const instanceId = storeState.allocateInstanceId();

      const result = new Promise<TResult>((resolve, reject) => {
        const Component = modal.component;

        const handleClose = (modalResult: TResult): void => {
          settleInstance(instanceId, () => {
            resolve(modalResult);
          });
        };

        const handleDismiss = (
          reason: ModalDismissReason = DEFAULT_DISMISS_REASON,
        ): void => {
          settleInstance(instanceId, () => {
            reject(new ModalDismissError(reason));
          });
        };

        const handleReject = (error: unknown): void => {
          settleInstance(instanceId, () => {
            reject(
              error instanceof Error ? error : new ModalRejectError(error),
            );
          });
        };

        storeState.addModal({
          instanceId,
          status: "open",
          definitionId: modal.id,
          render: () => (
            <Component
              close={handleClose}
              dismiss={handleDismiss}
              instanceId={instanceId}
              input={input}
              reject={handleReject}
            />
          ),
          dismiss: (reason) => {
            reject(new ModalDismissError(reason));
          },
        });
      });

      const dismissHandle = (reason?: ModalDismissReason): void => {
        dismiss(instanceId, reason);
      };

      return Object.assign(result, { dismiss: dismissHandle, instanceId });
    },
    [dismiss, settleInstance, store],
  );

  const confirm = useCallback<ModalManager["confirm"]>(
    (params) => open(confirmModal, params),
    [confirmModal, open],
  );

  return useMemo(
    () => ({ closeAll, confirm, dismiss, open }),
    [closeAll, confirm, dismiss, open],
  );
}
