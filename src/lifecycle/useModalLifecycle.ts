import { useContext } from "react";
import { ModalLifecycleContext } from "./ModalLifecycleContext";
import type { ModalLifecycle } from "./modalLifecycle.types";

export function useModalLifecycle(): ModalLifecycle {
  const lifecycle = useContext(ModalLifecycleContext);

  if (lifecycle === undefined) {
    throw new Error("Modal lifecycle must be used within ModalProvider");
  }

  return lifecycle;
}
