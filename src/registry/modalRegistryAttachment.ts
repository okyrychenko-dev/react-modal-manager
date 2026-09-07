import { isFunction, isObject } from "@okyrychenko-dev/type-utils";
import type { ModalManager } from "../hooks";

export const MODAL_REGISTRY_ATTACH = Symbol("modal-registry-attach");

export interface ModalRegistryAttachable {
  [MODAL_REGISTRY_ATTACH](manager: ModalManager): VoidFunction;
}

export function isModalRegistryAttachable(
  value: unknown,
): value is ModalRegistryAttachable {
  return isObject(value) && isFunction(value[MODAL_REGISTRY_ATTACH]);
}

export function attachModalRegistry(
  registry: ModalRegistryAttachable,
  manager: ModalManager,
): VoidFunction {
  return registry[MODAL_REGISTRY_ATTACH](manager);
}
