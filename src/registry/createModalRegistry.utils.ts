import { MODAL_CONTROLLER_UNBOUND_ERROR } from "./createModalRegistry.constants";
import type { ModalManager } from "../hooks";
import type {
  ModalRegistryAttachment,
  ModalRegistryRouter,
} from "./createModalRegistry.types";

export function createModalRegistryRouter(): ModalRegistryRouter {
  let attachments: Array<ModalRegistryAttachment> = [];

  const activeManager = (): ModalManager => {
    if (attachments.length === 0) {
      throw new Error(MODAL_CONTROLLER_UNBOUND_ERROR);
    }

    return attachments[attachments.length - 1].manager;
  };
  const bind = (manager: ModalManager): VoidFunction => {
    const attachment: ModalRegistryAttachment = { manager };
    attachments.push(attachment);

    return () => {
      attachments = attachments.filter((candidate) => candidate !== attachment);
    };
  };
  return { activeManager, bind, isReady: () => attachments.length > 0 };
}
