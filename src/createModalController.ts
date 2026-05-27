import { MODAL_CONTROLLER_UNBOUND_ERROR } from "./createModalController.constants";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalController,
  ModalDefinition,
  ModalDismissReason,
  ModalInstanceId,
  ModalManager,
} from "./types";

export function createModalController(): ModalController {
  const managerStack: Array<ModalManager> = [];

  const getActiveManager = (): ModalManager => {
    if (managerStack.length === 0) {
      throw new Error(MODAL_CONTROLLER_UNBOUND_ERROR);
    }

    return managerStack[managerStack.length - 1];
  };

  return {
    bind: (manager) => {
      managerStack.push(manager);

      return () => {
        const managerIndex = managerStack.lastIndexOf(manager);

        if (managerIndex >= 0) {
          managerStack.splice(managerIndex, 1);
        }
      };
    },
    closeAll: (reason?: ModalDismissReason) => {
      getActiveManager().closeAll(reason);
    },
    confirm: (params: ConfirmModalParams): Promise<ConfirmModalResult> =>
      getActiveManager().confirm(params),
    dismiss: (
      instanceId: ModalInstanceId,
      reason?: ModalDismissReason,
    ): void => {
      getActiveManager().dismiss(instanceId, reason);
    },
    isReady: () => managerStack.length > 0,
    open: <TInput, TResult>(
      modal: ModalDefinition<TInput, TResult>,
      input: TInput,
    ): Promise<TResult> => getActiveManager().open(modal, input),
  };
}
