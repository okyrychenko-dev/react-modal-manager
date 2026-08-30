import { useModalStore } from "./useModalStore";
import type { ModalLifecycleInstance } from "../lifecycle";

export const useModals = (): Array<ModalLifecycleInstance> =>
  useModalStore((state) => state.modals);
