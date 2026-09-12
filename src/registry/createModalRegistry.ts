import {
  assertTrue,
  hasProperty,
  isFunction,
  isNonEmptyArray,
  isObject,
} from "@okyrychenko-dev/type-utils";
import {
  MODAL_CONTROLLER_UNBOUND_ERROR,
  MODAL_REGISTRY_UNKNOWN_KEY_ERROR,
} from "./createModalRegistry.constants";
import type { ModalHandle, ModalManager } from "../hooks";
import type { ModalDismissReason, ModalInstanceId } from "../types";
import type {
  ModalRegistry,
  ModalRegistryDefinitions,
  ModalRegistryInput,
} from "./createModalRegistry.types";

const MODAL_REGISTRY_ATTACH = Symbol("modal-registry-attach");

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

export function createModalRegistry<
  const TDefinitions extends ModalRegistryDefinitions,
>(definitions: TDefinitions): ModalRegistry<TDefinitions> {
  let attachments: Array<{ manager: ModalManager }> = [];

  const activeManager = (): ModalManager => {
    assertTrue(isNonEmptyArray(attachments), MODAL_CONTROLLER_UNBOUND_ERROR);

    return attachments[attachments.length - 1].manager;
  };

  const attach = (manager: ModalManager): VoidFunction => {
    const attachment = { manager };
    attachments.push(attachment);

    return () => {
      attachments = attachments.filter((candidate) => candidate !== attachment);
    };
  };

  function open<TKey extends keyof TDefinitions & string>(
    key: TKey,
    input: ModalRegistryInput<TDefinitions[TKey]>,
  ): ReturnType<TDefinitions[TKey]["open"]>;
  function open(key: string, input: unknown): ModalHandle<unknown> {
    assertTrue(
      hasProperty(definitions, key),
      () => `${MODAL_REGISTRY_UNKNOWN_KEY_ERROR}: ${key}`,
    );

    return definitions[key].open(activeManager(), input);
  }

  const registry: ModalRegistry<TDefinitions> & {
    [MODAL_REGISTRY_ATTACH]: (manager: ModalManager) => VoidFunction;
  } = {
    closeAll: (reason?: ModalDismissReason) => {
      activeManager().closeAll(reason);
    },
    confirm: (params: Parameters<ModalManager["confirm"]>[0]) => {
      return activeManager().confirm(params);
    },
    dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => {
      activeManager().dismiss(instanceId, reason);
    },
    isReady: () => isNonEmptyArray(attachments),
    open,
    [MODAL_REGISTRY_ATTACH]: attach,
  };

  return registry;
}
