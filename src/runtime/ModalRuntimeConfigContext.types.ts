import type { ConfirmModalParams, ConfirmModalResult } from "../confirm";
import type { ModalDefinition } from "../types";

export interface ModalRuntimeConfig {
  closeDelayMs: number;
  confirmModal: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
}
