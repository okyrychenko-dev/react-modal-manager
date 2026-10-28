import { useEffect } from "react";
import type { ReactNode } from "react";
import type { ConfirmModalResult } from "../../confirm";
import type { ModalHandle, ModalManager } from "../../hooks";

interface RegistryEffectOpenerProps {
  registry: Pick<ModalManager, "confirm">;
  onOpen: (handle: ModalHandle<ConfirmModalResult>) => void;
}

export function RegistryEffectOpener({
  registry,
  onOpen,
}: RegistryEffectOpenerProps): ReactNode {
  useEffect(() => {
    const handle = registry.confirm({ title: "Effect confirmation" });
    void handle.catch(() => undefined);

    onOpen(handle);
  }, [registry, onOpen]);

  return null;
}
