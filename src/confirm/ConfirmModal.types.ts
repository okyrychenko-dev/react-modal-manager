import type { ReactNode } from "react";

export type ConfirmModalVariant = "default" | "danger" | "warning" | "success";
export type ConfirmationModalRejectReason = "cancel" | "dismiss";

export interface ConfirmModalParams {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  dismissible?: boolean;
}

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
