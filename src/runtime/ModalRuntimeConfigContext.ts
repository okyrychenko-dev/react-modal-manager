import { createContext } from "react";
import { confirmModal } from "../confirm";
import type { ModalRuntimeConfig } from "./ModalRuntimeConfigContext.types";

export const ModalRuntimeConfigContext = createContext<ModalRuntimeConfig>({
  closeDelayMs: 0,
  confirmModal,
});
