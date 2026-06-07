import type {
  ModalOptions,
  RegisteredModalDefinition,
} from "./createModal.types";

function createGeneratedModalId(): string {
  return `modal-definition-${crypto.randomUUID()}`;
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
