import type { ModalManager } from "../hooks";

export interface ModalController extends ModalManager {
  bind: (manager: ModalManager) => VoidFunction;
  isReady: () => boolean;
}
