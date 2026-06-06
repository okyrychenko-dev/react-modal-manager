import { useMemo } from "react";
import {
  ModalStoreCleanup,
  ModalViewport,
  confirmModal as defaultConfirmModal,
} from "../components";
import { ModalStoreProvider } from "../store";
import { ModalControllerBinder } from "./ModalControllerBinder";
import { ModalRuntimeConfigContext } from "./ModalRuntimeConfigContext";
import type { ReactNode } from "react";
import type { ModalRuntimeConfig } from "../types";
import type { ModalProviderProps } from "./ModalProvider.types";

export function ModalProvider(props: ModalProviderProps): ReactNode {
  const {
    children,
    closeDelayMs = 0,
    confirmModal = defaultConfirmModal,
    controller,
    renderer,
  } = props;

  const runtimeConfig = useMemo<ModalRuntimeConfig>(
    () => ({ closeDelayMs, confirmModal }),
    [closeDelayMs, confirmModal],
  );

  return (
    <ModalStoreProvider>
      <ModalRuntimeConfigContext.Provider value={runtimeConfig}>
        {children}
        {controller && <ModalControllerBinder controller={controller} />}
        <ModalViewport renderer={renderer} />
        <ModalStoreCleanup />
      </ModalRuntimeConfigContext.Provider>
    </ModalStoreProvider>
  );
}
