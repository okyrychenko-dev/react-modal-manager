import { useEffect, useRef, useState } from "react";
import { createModalLifecycle } from "../lifecycle/modalLifecycle";
import type { ModalLifecycle } from "../lifecycle/modalLifecycle.types";

export function useModalLifecycleOwner(closeDelayMs: number): ModalLifecycle {
  const [lifecycle] = useState(() => createModalLifecycle({ closeDelayMs }));
  const mountGeneration = useRef(0);

  useEffect(() => {
    lifecycle.setCloseDelayMs(closeDelayMs);
  }, [closeDelayMs, lifecycle]);

  useEffect(() => {
    mountGeneration.current += 1;

    return () => {
      mountGeneration.current += 1;
      const cleanupGeneration = mountGeneration.current;

      globalThis.queueMicrotask(() => {
        if (mountGeneration.current === cleanupGeneration) {
          lifecycle.dispose();
        }
      });
    };
  }, [lifecycle]);

  return lifecycle;
}
