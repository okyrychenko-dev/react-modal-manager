import { type ReactNode, useEffect, useRef } from "react";
import { useModalManager } from "../hooks";
import { attachModalRegistry } from "../registry/createModalRegistry";
import type { ModalRegistryAttachable } from "../registry/createModalRegistry";

interface ModalRegistryBinderProps {
  registry: ModalRegistryAttachable;
}

export function ModalRegistryBinder(
  props: ModalRegistryBinderProps,
): ReactNode {
  const { registry } = props;

  const manager = useModalManager();

  const managerRef = useRef(manager);

  useEffect(() => {
    managerRef.current = manager;
  }, [manager]);

  useEffect(() => {
    const unbind = attachModalRegistry(registry, () => managerRef.current);

    return () => {
      unbind();
    };
  }, [registry]);

  return null;
}
