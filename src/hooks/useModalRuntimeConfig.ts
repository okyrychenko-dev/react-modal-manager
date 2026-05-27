import { useContext } from "react";
import { ModalRuntimeConfigContext } from "../context";
import type { ModalRuntimeConfig } from "../types";

export function useModalRuntimeConfig(): ModalRuntimeConfig {
  return useContext(ModalRuntimeConfigContext);
}
