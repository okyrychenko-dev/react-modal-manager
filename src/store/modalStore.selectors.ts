import { useModalStore } from "./modalStore";
import type { ModalInstance } from "./modalStore.types";

export const useModals = (): Array<ModalInstance> =>
  useModalStore((state) => state.modals);
