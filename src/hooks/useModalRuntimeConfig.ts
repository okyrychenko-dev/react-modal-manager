import { useContext } from "react";
import { ModalRuntimeConfigContext } from "../runtime";
import type { ModalRuntimeConfig } from "../runtime";

export function useModalRuntimeConfig(): ModalRuntimeConfig {
  return useContext(ModalRuntimeConfigContext);
}
