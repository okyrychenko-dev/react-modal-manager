import { createContext } from "react";
import { confirmModal } from "../components";
import type { ModalRuntimeConfig } from "../types";

export const ModalRuntimeConfigContext = createContext<ModalRuntimeConfig>({
  closeDelayMs: 0,
  confirmModal,
});
