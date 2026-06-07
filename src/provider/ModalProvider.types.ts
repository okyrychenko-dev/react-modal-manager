import type { ReactNode } from "react";
import type { ConfirmModalParams, ConfirmModalResult } from "../confirm";
import type { ModalRegistryBinding } from "../registry";
import type { ModalDefinition } from "../types";
import type { ModalRenderer } from "../viewport";

export interface ModalProviderProps {
  children: ReactNode;
  closeDelayMs?: number;
  confirmModal?: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
  registry?: ModalRegistryBinding;
  renderer?: ModalRenderer;
}
