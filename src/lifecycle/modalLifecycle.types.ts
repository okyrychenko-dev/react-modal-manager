import type { ReactNode } from "react";
import type {
  ModalDefinition,
  ModalDismissReason,
  ModalId,
  ModalInstanceId,
  ModalInstanceStatus,
} from "../types";

export interface ModalLifecycleInstance {
  definitionId: ModalId;
  instanceId: ModalInstanceId;
  render: () => ReactNode;
  status: ModalInstanceStatus;
}

export interface ModalLifecycleState {
  instances: Array<ModalLifecycleInstance>;
}

export type ModalLifecycleHandle<TResult> = Promise<TResult> & {
  dismiss: (reason?: ModalDismissReason) => void;
  instanceId: ModalInstanceId;
};

export interface ModalLifecycleObservation {
  getSnapshot: () => ModalLifecycleState;
  getServerSnapshot: () => ModalLifecycleState;
  subscribe: (observer: VoidFunction) => VoidFunction;
}

export interface ModalLifecycle extends ModalLifecycleObservation {
  closeAll: (reason?: ModalDismissReason) => void;
  dispose: () => void;
  dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => void;
  open: <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    input: TInput,
  ) => ModalLifecycleHandle<TResult>;
  setCloseDelayMs: (closeDelayMs: number) => void;
}

export interface CreateModalLifecycleOptions {
  closeDelayMs: number;
}
