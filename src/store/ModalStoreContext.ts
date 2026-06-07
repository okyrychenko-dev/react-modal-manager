import { createContext } from "react";
import type { StoreApi } from "zustand";
import type { ModalStore } from "./modalStore.types";

export const ModalStoreContext = createContext<
  StoreApi<ModalStore> | undefined
>(undefined);
