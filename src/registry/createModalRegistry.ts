import { assertTrue, hasProperty } from "@okyrychenko-dev/type-utils";
import { MODAL_REGISTRY_UNKNOWN_KEY_ERROR } from "./createModalRegistry.constants";
import { createModalRegistryRouter } from "./createModalRegistry.utils";
import { MODAL_REGISTRY_ATTACH } from "./modalRegistryAttachment";
import type { ModalHandle, ModalManager } from "../hooks";
import type { ModalDismissReason, ModalInstanceId } from "../types";
import type {
  ModalRegistry,
  ModalRegistryDefinitions,
  ModalRegistryInput,
} from "./createModalRegistry.types";

export function createModalRegistry<
  const TDefinitions extends ModalRegistryDefinitions,
>(definitions: TDefinitions): ModalRegistry<TDefinitions> {
  const router = createModalRegistryRouter();

  function open<TKey extends keyof TDefinitions & string>(
    key: TKey,
    input: ModalRegistryInput<TDefinitions[TKey]>,
  ): ReturnType<TDefinitions[TKey]["open"]>;
  function open(key: string, input: unknown): ModalHandle<unknown> {
    assertTrue(
      hasProperty(definitions, key),
      () => `${MODAL_REGISTRY_UNKNOWN_KEY_ERROR}: ${key}`,
    );

    return definitions[key].open(router.activeManager(), input);
  }

  const registry: ModalRegistry<TDefinitions> & {
    [MODAL_REGISTRY_ATTACH]: (manager: ModalManager) => VoidFunction;
  } = {
    closeAll: (reason?: ModalDismissReason) => {
      router.activeManager().closeAll(reason);
    },
    confirm: (params: Parameters<ModalManager["confirm"]>[0]) => {
      return router.activeManager().confirm(params);
    },
    dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => {
      router.activeManager().dismiss(instanceId, reason);
    },
    isReady: router.isReady,
    open,
    [MODAL_REGISTRY_ATTACH]: router.bind,
  };

  return registry;
}
