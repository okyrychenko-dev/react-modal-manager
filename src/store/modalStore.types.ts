import type { ModalLifecycleInstance } from "../lifecycle";

export interface ModalStoreState {
  modals: Array<ModalLifecycleInstance>;
}

export type ModalStore = ModalStoreState;
