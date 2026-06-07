import { createStore } from "zustand/vanilla";
import { createModalStoreActions } from "./modalStore.actions";
import { MODAL_STORE_DEFAULTS } from "./modalStore.constants";
import type { StoreApi } from "zustand";
import type { ModalStore } from "./modalStore.types";

export function createModalStore(): StoreApi<ModalStore> {
  return createStore<ModalStore>((set, get) => ({
    ...MODAL_STORE_DEFAULTS,
    ...createModalStoreActions(set, get),
  }));
}
