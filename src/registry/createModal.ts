import type {
  ModalOptions,
  RegisteredModalDefinition,
} from "./createModal.types";

let nextModalDefinitionIndex = 0;

function createGeneratedModalId(): string {
  const id = `modal-definition-${String(nextModalDefinitionIndex)}`;

  nextModalDefinitionIndex += 1;

  return id;
}

export function createModal<TInput, TResult>(
  options: ModalOptions<TInput, TResult>,
): RegisteredModalDefinition<TInput, TResult> {
  const definition = {
    ...options,
    id: options.id ?? createGeneratedModalId(),
  };

  return {
    ...definition,
    open: (manager, input) => manager.open(definition, input),
  };
}
