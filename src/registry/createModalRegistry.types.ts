import type { ModalHandle, ModalManager } from "../hooks";
import type { ModalOpenArgs } from "../types";

export interface ModalRegistryEntry<TInput, TResult> {
  open(
    manager: ModalManager,
    ...args: ModalOpenArgs<TInput>
  ): ModalHandle<TResult>;
}

export type ModalRegistryDefinitions = Readonly<
  Record<string, ModalRegistryEntry<unknown, unknown>>
>;

export type ModalRegistryInput<
  TDefinition extends ModalRegistryEntry<unknown, unknown>,
> = Parameters<TDefinition["open"]>[1];

export type ModalRegistryResult<
  TDefinition extends ModalRegistryEntry<unknown, unknown>,
> = Awaited<ReturnType<TDefinition["open"]>>;

export interface ModalRegistryBinding {
  isReady: () => boolean;
}

export interface ModalController extends ModalManager {
  bind: (manager: ModalManager) => VoidFunction;
  isReady: () => boolean;
}

export interface ModalRegistry<
  TDefinitions extends ModalRegistryDefinitions,
> extends ModalRegistryBinding {
  closeAll: ModalManager["closeAll"];
  confirm: ModalManager["confirm"];
  dismiss: ModalManager["dismiss"];
  open: <TKey extends keyof TDefinitions & string>(
    key: TKey,
    ...args: ModalOpenArgs<ModalRegistryInput<TDefinitions[TKey]>>
  ) => ReturnType<TDefinitions[TKey]["open"]>;
}
