import type { ModalDefinition, RegisteredModalDefinition } from "./types";

export function createModal<TInput, TResult>(
  definition: ModalDefinition<TInput, TResult>,
): RegisteredModalDefinition<TInput, TResult> {
  return {
    ...definition,
    open: (manager, input) => manager.open(definition, input),
  };
}
