import type { ModalHandle, ModalManager } from "../hooks";
import type { ModalComponent, ModalDefinition, ModalId } from "../types";

export interface ModalOptions<TInput, TResult> {
  id?: ModalId;
  component: ModalComponent<TInput, TResult>;
}

export interface RegisteredModalDefinition<
  TInput,
  TResult,
> extends ModalDefinition<TInput, TResult> {
  open(manager: ModalManager, input: TInput): ModalHandle<TResult>;
}
