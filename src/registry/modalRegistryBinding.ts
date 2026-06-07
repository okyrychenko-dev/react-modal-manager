import type { ModalController } from "./createModalController.types";
import type { ModalRegistryBinding } from "./createModalRegistry.types";

const registryControllers = new WeakMap<
  ModalRegistryBinding,
  ModalController
>();

export function bindModalRegistry(
  registry: ModalRegistryBinding,
  controller: ModalController,
): void {
  registryControllers.set(registry, controller);
}

export function getModalRegistryController(
  registry: ModalRegistryBinding,
): ModalController | undefined {
  return registryControllers.get(registry);
}
