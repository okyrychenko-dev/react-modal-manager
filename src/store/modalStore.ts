import { createStore } from "zustand/vanilla";
import { MODAL_STORE_DEFAULTS } from "./modalStore.constants";
import type { StoreApi } from "zustand";
import type { ModalStore } from "./modalStore.types";

export function createModalStore(): StoreApi<ModalStore> {
  return createStore<ModalStore>(() => MODAL_STORE_DEFAULTS);
}
