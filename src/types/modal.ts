import type { ReactNode } from "react";

export type ModalId = string;
export type ModalInstanceId = string;
export type ModalDismissReason = "dismiss" | "close-all" | "provider-unmount";
export type ModalInstanceStatus = "open" | "closing";

export interface ModalComponentProps<TInput, TResult> {
  input: TInput;
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

export interface ModalView {
  definitionId: ModalId;
  instanceId: ModalInstanceId;
  status: ModalInstanceStatus;
}

export interface ModalRendererProps {
  children: ReactNode;
  modal: ModalView;
}

export type ModalRenderer = (props: ModalRendererProps) => ReactNode;

export interface ConfirmModalParams {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  dismissible?: boolean;
}

export type ConfirmModalVariant = "default" | "danger" | "warning" | "success";
export type ConfirmationModalRejectReason = "cancel" | "dismiss";

export interface ConfirmationModalConfirmedResult {
  confirmed: true;
}

export interface ConfirmationModalRejectedResult {
  confirmed: false;
  reason: ConfirmationModalRejectReason;
}

export type ConfirmModalResult =
  | ConfirmationModalConfirmedResult
  | ConfirmationModalRejectedResult;

export interface ModalHandle<TResult> extends Promise<TResult> {
  instanceId: ModalInstanceId;
  dismiss: (reason?: ModalDismissReason) => void;
}

export interface ModalManager {
  open: <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    input: TInput,
  ) => ModalHandle<TResult>;
  confirm: (params: ConfirmModalParams) => Promise<ConfirmModalResult>;
  dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => void;
  closeAll: (reason?: ModalDismissReason) => void;
}

export interface ModalController extends ModalManager {
  bind: (manager: ModalManager) => VoidFunction;
  isReady: () => boolean;
}

export interface RegisteredModalDefinition<
  TInput,
  TResult,
> extends ModalDefinition<TInput, TResult> {
  open(manager: ModalManager, input: TInput): ModalHandle<TResult>;
}

export interface ModalRegistryEntry<TInput, TResult> {
  open(manager: ModalManager, input: TInput): ModalHandle<TResult>;
}

export type ModalRegistryDefinitions = Readonly<
  Record<string, ModalRegistryEntry<unknown, unknown>>
>;

export type ModalRegistryInput<
  TDefinition extends ModalRegistryEntry<unknown, unknown>,
> = Parameters<TDefinition["open"]>[1];

export type ModalRegistryResult<
  TDefinition extends ModalRegistryEntry<unknown, unknown>,
> = Awaited<ReturnType<TDefinition["open"]>>;

export interface ModalRegistry<TDefinitions extends ModalRegistryDefinitions> {
  readonly controller: ModalController;
  closeAll: ModalController["closeAll"];
  confirm: ModalController["confirm"];
  dismiss: ModalController["dismiss"];
  isReady: ModalController["isReady"];
  open: <TKey extends keyof TDefinitions & string>(
    key: TKey,
    input: ModalRegistryInput<TDefinitions[TKey]>,
  ) => ReturnType<TDefinitions[TKey]["open"]>;
}

export interface ModalRuntimeConfig {
  closeDelayMs: number;
  confirmModal: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
}
