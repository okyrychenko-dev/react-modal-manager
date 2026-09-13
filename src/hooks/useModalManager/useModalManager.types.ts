import type { ConfirmModalParams, ConfirmModalResult } from "../../confirm";
import type {
  ModalDefinition,
  ModalDismissReason,
  ModalInstanceId,
  ModalOpenArgs,
} from "../../types";

export interface ModalHandle<TResult> extends Promise<TResult> {
  instanceId: ModalInstanceId;
  dismiss: (reason?: ModalDismissReason) => void;
}

export interface ModalManager {
  open: <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    ...args: ModalOpenArgs<TInput>
  ) => ModalHandle<TResult>;
  confirm: (params: ConfirmModalParams) => Promise<ConfirmModalResult>;
  dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => void;
  closeAll: (reason?: ModalDismissReason) => void;
}
