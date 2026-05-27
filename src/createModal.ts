import type { ModalDefinition } from "./types";

export function createModal<TInput, TResult>(
  definition: ModalDefinition<TInput, TResult>,
): ModalDefinition<TInput, TResult> {
  return definition;
}
