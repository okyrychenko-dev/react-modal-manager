import type { ReactNode } from "react";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
  ModalController,
  ModalDefinition,
  ModalRenderer,
} from "../types";

export interface ModalProviderProps {
  children: ReactNode;
  closeDelayMs?: number;
  confirmModal?: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
  controller?: ModalController;
  renderer?: ModalRenderer;
}
