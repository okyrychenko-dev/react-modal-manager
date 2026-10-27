import type { ModalHandle } from "../useModalManager";

export interface OwnedModalHandles {
  /** Track a handle until settlement, preserving its result or rejection. */
  track: <TResult>(handle: ModalHandle<TResult>) => Promise<TResult>;
  /** Dismiss pending tracked handles without ending the current lifetime. */
  dismissAll: VoidFunction;
  /** Capture a guard that stays false after this effect lifetime ends. */
  captureLifetime: () => () => boolean;
}
