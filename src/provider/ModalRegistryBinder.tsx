import { useEffect } from "react";
import { useModalManager } from "../hooks";
import type { ReactNode } from "react";
import type { ModalController } from "../registry";

interface ModalRegistryBinderProps {
  controller: ModalController;
}

export function ModalRegistryBinder(
  props: ModalRegistryBinderProps,
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
