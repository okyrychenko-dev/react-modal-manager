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

export interface ModalManager {
  open: <TInput, TResult>(
    modal: ModalDefinition<TInput, TResult>,
    input: TInput,
  ) => Promise<TResult>;
  confirm: (params: ConfirmModalParams) => Promise<ConfirmModalResult>;
  dismiss: (instanceId: ModalInstanceId, reason?: ModalDismissReason) => void;
  closeAll: (reason?: ModalDismissReason) => void;
}

export interface ModalController extends ModalManager {
  bind: (manager: ModalManager) => VoidFunction;
  isReady: () => boolean;
}

export interface ModalRuntimeConfig {
  closeDelayMs: number;
  confirmModal: ModalDefinition<ConfirmModalParams, ConfirmModalResult>;
}
