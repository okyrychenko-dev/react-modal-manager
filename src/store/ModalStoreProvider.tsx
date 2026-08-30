import { useEffect, useState } from "react";
import { ModalLifecycleContext, createModalLifecycle } from "../lifecycle";
import { createModalStore } from "./modalStore";
import { ModalStoreContext } from "./ModalStoreContext";
import type { ReactNode } from "react";
import type { ModalStoreProviderProps } from "./ModalStoreProvider.types";

export function ModalStoreProvider({
  children,
  closeDelayMs,
}: ModalStoreProviderProps): ReactNode {
  const [store] = useState(createModalStore);
  const [lifecycle] = useState(() =>
    createModalLifecycle({
      closeDelayMs,
      onStateChange: ({ instances }) => {
        store.setState({ modals: instances });
      },
    }),
  );

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
    <ModalStoreContext.Provider value={store}>
      <ModalLifecycleContext.Provider value={lifecycle}>
        {children}
      </ModalLifecycleContext.Provider>
    </ModalStoreContext.Provider>
  );
}
