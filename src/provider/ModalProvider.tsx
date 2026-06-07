import { useMemo } from "react";
import { confirmModal as defaultConfirmModal } from "../confirm";
import { getModalRegistryController } from "../registry/modalRegistryBinding";
import { ModalRuntimeConfigContext } from "../runtime";
import { ModalStoreProvider } from "../store";
import { ModalViewport } from "../viewport";
import { ModalRegistryBinder } from "./ModalRegistryBinder";
import { ModalStoreCleanup } from "./ModalStoreCleanup";
import type { ReactNode } from "react";
import type { ModalRuntimeConfig } from "../runtime";
import type { ModalProviderProps } from "./ModalProvider.types";

export function ModalProvider(props: ModalProviderProps): ReactNode {
  const {
    children,
    closeDelayMs = 0,
    confirmModal = defaultConfirmModal,
    registry,
    renderer,
  } = props;
  const registryController =
    registry === undefined ? undefined : getModalRegistryController(registry);

  if (registry !== undefined && registryController === undefined) {
    throw new Error(
      "ModalProvider registry must be created by createModalRegistry",
    );
  }

  const runtimeConfig = useMemo<ModalRuntimeConfig>(
    () => ({ closeDelayMs, confirmModal }),
    [closeDelayMs, confirmModal],
  );

  return (
    <ModalStoreProvider>
      <ModalRuntimeConfigContext.Provider value={runtimeConfig}>
        {children}
        {registryController && (
          <ModalRegistryBinder controller={registryController} />
        )}
        <ModalViewport renderer={renderer} />
        <ModalStoreCleanup />
      </ModalRuntimeConfigContext.Provider>
    </ModalStoreProvider>
  );
}
