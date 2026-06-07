import { createModalController } from "./createModalController";
import { MODAL_REGISTRY_UNKNOWN_KEY_ERROR } from "./createModalRegistry.constants";
import { bindModalRegistry } from "./modalRegistryBinding";
import type { ModalHandle } from "../hooks";
import type {
  ModalRegistry,
  ModalRegistryDefinitions,
  ModalRegistryInput,
} from "./createModalRegistry.types";

export function createModalRegistry<
  const TDefinitions extends ModalRegistryDefinitions,
>(definitions: TDefinitions): ModalRegistry<TDefinitions> {
  const controller = createModalController();

  function open<TKey extends keyof TDefinitions & string>(
    key: TKey,
    input: ModalRegistryInput<TDefinitions[TKey]>,
  ): ReturnType<TDefinitions[TKey]["open"]>;
  function open(key: string, input: unknown): ModalHandle<unknown> {
    if (!Object.prototype.hasOwnProperty.call(definitions, key)) {
      throw new Error(`${MODAL_REGISTRY_UNKNOWN_KEY_ERROR}: ${key}`);
    }

    return definitions[key].open(controller, input);
  }

  const registry: ModalRegistry<TDefinitions> = {
    closeAll: controller.closeAll,
    confirm: controller.confirm,
    dismiss: controller.dismiss,
    isReady: controller.isReady,
    open,
  };

  bindModalRegistry(registry, controller);

  return registry;
}
