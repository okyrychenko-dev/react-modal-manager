import type { ReactNode } from "react";
import type {
  ModalDefinition,
  ModalDismissReason,
  ModalId,
  ModalInstanceId,
  ModalInstanceStatus,
  ModalOpenArgs,
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
  whenRemoved: () => Promise<void>;
};

export interface ModalLifecycleObservation {
  getSnapshot: () => ModalLifecycleState;
  getServerSnapshot: () => ModalLifecycleState;
  subscribe: (observer: VoidFunction) => VoidFunction;
}

export interface ModalLifecycle extends ModalLifecycleObservation {
  resume: () => void;
  closeAll: (reason?: ModalDismissReason) => void;
  dispose: () => void;
  dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => void;
  open: <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    ...args: ModalOpenArgs<TInput>
  ) => ModalLifecycleHandle<TResult>;
  setCloseDelayMs: (closeDelayMs: number) => void;
}

export interface CreateModalLifecycleOptions {
  closeDelayMs: number;
}
