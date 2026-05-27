import type { ReactNode } from "react";
import type {
  ModalDismissReason,
  ModalId,
  ModalInstanceId,
  ModalInstanceStatus,
} from "../types";

export interface ModalInstance {
  definitionId: ModalId;
  instanceId: ModalInstanceId;
  status: ModalInstanceStatus;
  dismiss: (reason: ModalDismissReason) => void;
  render: () => ReactNode;
}

export interface ModalStoreState {
  modals: Array<ModalInstance>;
  nextInstanceIndex: number;
}

export interface ModalStoreActions {
  allocateInstanceId: () => ModalInstanceId;
  addModal: (modal: ModalInstance) => void;
  markModalClosing: (instanceId: ModalInstanceId) => void;
  scheduleRemove: (instanceId: ModalInstanceId, delayMs: number) => void;
  removeModal: (instanceId: ModalInstanceId) => void;
  clearModals: () => void;
  clearRemoveTimers: () => void;
  dismissAll: (reason: ModalDismissReason) => void;
}

export type ModalStore = ModalStoreState & ModalStoreActions;
