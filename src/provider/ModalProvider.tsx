import { assertTrue, isDefined } from "@okyrychenko-dev/type-utils";
import { useMemo } from "react";
import { confirmModal as defaultConfirmModal } from "../confirm/builtInConfirmModal";
import { ModalLifecycleContext } from "../lifecycle/ModalLifecycleContext";
import { isModalRegistryAttachable } from "../registry/createModalRegistry";
import { ModalRuntimeConfigContext } from "../runtime/ModalRuntimeConfigContext";
import { ModalViewport } from "../viewport/ModalViewport";
import { ModalRegistryBinder } from "./ModalRegistryBinder";
import { useModalLifecycleOwner } from "./useModalLifecycleOwner";
import type { ReactNode } from "react";
import type { ModalRuntimeConfig } from "../runtime/ModalRuntimeConfigContext.types";
import type { ModalProviderProps } from "./ModalProvider.types";

export function ModalProvider(props: ModalProviderProps): ReactNode {
  const {
    children,
    closeDelayMs = 0,
    confirmModal = defaultConfirmModal,
    registry,
    renderer,
  } = props;

  if (isDefined(registry)) {
    assertTrue(
      isModalRegistryAttachable(registry),
      "ModalProvider registry must be created by createModalRegistry",
    );
  }

  const runtimeConfig = useMemo<ModalRuntimeConfig>(
    () => ({ closeDelayMs, confirmModal }),
    [closeDelayMs, confirmModal],
  );

  const lifecycle = useModalLifecycleOwner(closeDelayMs);

  return (
    <ModalLifecycleContext.Provider value={lifecycle}>
      <ModalRuntimeConfigContext.Provider value={runtimeConfig}>
        {children}
        {isDefined(registry) && <ModalRegistryBinder registry={registry} />}
        <ModalViewport renderer={renderer} />
      </ModalRuntimeConfigContext.Provider>
    </ModalLifecycleContext.Provider>
  );
}
