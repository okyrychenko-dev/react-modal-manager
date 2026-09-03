import { useEffect, useMemo, useState } from "react";
import { confirmModal as defaultConfirmModal } from "../confirm";
import { ModalLifecycleContext, createModalLifecycle } from "../lifecycle";
import { getModalRegistryController } from "../registry/modalRegistryBinding";
import { ModalRuntimeConfigContext } from "../runtime";
import { ModalViewport } from "../viewport";
import { ModalRegistryBinder } from "./ModalRegistryBinder";
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
  const [lifecycle] = useState(() => createModalLifecycle({ closeDelayMs }));

  useEffect(() => {
    lifecycle.setCloseDelayMs(closeDelayMs);
  }, [closeDelayMs, lifecycle]);

  useEffect(
    () => () => {
      lifecycle.dispose();
    },
    [lifecycle],
  );

  return (
    <ModalLifecycleContext.Provider value={lifecycle}>
      <ModalRuntimeConfigContext.Provider value={runtimeConfig}>
        {children}
        {registryController && (
          <ModalRegistryBinder controller={registryController} />
        )}
        <ModalViewport renderer={renderer} />
      </ModalRuntimeConfigContext.Provider>
    </ModalLifecycleContext.Provider>
  );
}
