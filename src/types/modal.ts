import type { ReactNode } from "react";

export type ModalId = string;
export type ModalInstanceId = string;
export type ModalDismissReason = "dismiss" | "close-all" | "provider-unmount";
export type ModalInstanceStatus = "open" | "closing";

type InputlessModalValue = ReturnType<VoidFunction>;

export type ModalOpenArgs<TInput> = [TInput] extends [InputlessModalValue]
  ? [input?: TInput]
  : [input: TInput];

export interface ModalComponentProps<TInput, TResult> {
  input: ModalOpenArgs<TInput>[0];
  instanceId: ModalInstanceId;
  close: (result: TResult) => void;
  dismiss: (reason?: ModalDismissReason) => void;
  reject: (error: unknown) => void;
}

export type ModalComponent<TInput, TResult> = (
  props: ModalComponentProps<TInput, TResult>,
) => ReactNode;

export interface ModalDefinition<TInput, TResult> {
  id: ModalId;
  component: ModalComponent<TInput, TResult>;
}
