import { assertDefined } from "@okyrychenko-dev/type-utils";
import { useContext } from "react";
import { ModalLifecycleContext } from "./ModalLifecycleContext";
import type { ModalLifecycle } from "./modalLifecycle.types";

export function useModalLifecycle(): ModalLifecycle {
  const lifecycle = useContext(ModalLifecycleContext);

  assertDefined(lifecycle, "Modal lifecycle must be used within ModalProvider");

  return lifecycle;
}
