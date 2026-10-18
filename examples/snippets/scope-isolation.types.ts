import type { ModalRegistry } from "@okyrychenko-dev/react-modal-manager";
import type { scopeOperation } from "./scope-isolation.constants";

export type ScopeRegistry = ModalRegistry<{ operation: typeof scopeOperation }>;

export interface ScopeLauncherProps {
  registry: ScopeRegistry;
  scope: string;
}
