import { useEffect } from "react";
import { useModalManager } from "../hooks";
import type { ReactNode } from "react";
import type { ModalController } from "../types";

interface ModalControllerBinderProps {
  controller: ModalController;
}

export function ModalControllerBinder(
  props: ModalControllerBinderProps,
): ReactNode {
  const { controller } = props;
  const manager = useModalManager();

  useEffect(() => {
    const unbind = controller.bind(manager);

    return () => {
      unbind();
    };
  }, [controller, manager]);

  return null;
}
