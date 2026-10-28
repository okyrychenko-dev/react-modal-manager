import { useEffect, useRef, useState } from "react";
import { createModalLifecycle } from "../lifecycle";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import type { ModalLifecycle } from "../lifecycle";

export function useModalLifecycleOwner(closeDelayMs: number): ModalLifecycle {
  const [lifecycle] = useState(() => createModalLifecycle({ closeDelayMs }));
  const mountGeneration = useRef(0);

  useEffect(() => {
    lifecycle.setCloseDelayMs(closeDelayMs);
  }, [closeDelayMs, lifecycle]);

  // Resume before descendant passive effects. Disposal stays passive because
  // Suspense can replay layout effects while keeping subscriptions connected.
  useIsomorphicLayoutEffect(() => {
    lifecycle.resume();
  }, [lifecycle]);

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
