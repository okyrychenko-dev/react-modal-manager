import { useSyncExternalStore } from "react";
import { useModalLifecycle } from "./useModalLifecycle";
import type { UseModalLifecycleStateReturn } from "./useModalLifecycleState.types";

export function useModalLifecycleState(): UseModalLifecycleStateReturn {
  const lifecycle = useModalLifecycle();

  return useSyncExternalStore(
    lifecycle.subscribe,
    lifecycle.getSnapshot,
    lifecycle.getServerSnapshot,
  );
}
