import type { ModalHandle } from "@okyrychenko-dev/react-modal-manager";

export interface Customer {
  id: string;
  name: string;
}

export interface FlowRun {
  active: boolean;
  pending: Set<ModalHandle<unknown>>;
}
