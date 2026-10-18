import { isUndefined } from "@okyrychenko-dev/type-utils";
import type {
  ModalOptions,
  RegisteredModalDefinition,
} from "./createModal.types";

let nextDefinitionId = 0;

export function createModal<TInput, TResult>(
  options: ModalOptions<TInput, TResult>,
): RegisteredModalDefinition<TInput, TResult> {
  let { id } = options;

  if (isUndefined(id)) {
    nextDefinitionId += 1;
    id = `modal-definition-${String(nextDefinitionId)}`;
  }

  const definition = {
    ...options,
    id,
  };

  return {
    ...definition,
    open: (manager, ...args) => manager.open(definition, ...args),
  };
}
