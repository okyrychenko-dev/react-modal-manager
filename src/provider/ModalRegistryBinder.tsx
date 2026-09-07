import { type ReactNode, useEffect } from "react";
import { useModalManager } from "../hooks";
import { attachModalRegistry } from "../registry/modalRegistryAttachment";
import type { ModalRegistryAttachable } from "../registry/modalRegistryAttachment";

interface ModalRegistryBinderProps {
  registry: ModalRegistryAttachable;
}

export function ModalRegistryBinder(
  props: ModalRegistryBinderProps,
): ReactNode {
  const { registry } = props;

  const manager = useModalManager();

  useEffect(() => {
    const unbind = attachModalRegistry(registry, manager);

    return () => {
      unbind();
    };
  }, [registry, manager]);

  return null;
}
