import { useContext } from "react";
import { useStore } from "zustand";
import { ModalStoreContext } from "./ModalStoreContext";
import type { StoreApi } from "zustand";
import type { ModalStore } from "./modalStore.types";

export function useModalStoreApi(): StoreApi<ModalStore> {
  const store = useContext(ModalStoreContext);

  if (store === undefined) {
    throw new Error("Modal store must be used within ModalProvider");
  }

  return store;
}

export function useModalStore<TSelected>(
  selector: (state: ModalStore) => TSelected,
): TSelected {
  return useStore(useModalStoreApi(), selector);
}
