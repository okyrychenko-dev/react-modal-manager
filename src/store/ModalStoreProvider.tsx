import { useState } from "react";
import { createModalStore } from "./modalStore";
import { ModalStoreContext } from "./ModalStoreContext";
import type { ReactNode } from "react";
import type { ModalStoreProviderProps } from "./ModalStoreProvider.types";

export function ModalStoreProvider({
  children,
}: ModalStoreProviderProps): ReactNode {
  const [store] = useState(createModalStore);

  return (
    <ModalStoreContext.Provider value={store}>
      {children}
    </ModalStoreContext.Provider>
  );
}
