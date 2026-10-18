"use client";

import { FailingContent } from "./FailingContent";
import { ModalContentBoundary } from "./ModalContentBoundary";
import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function RecoverableContent(
  props: ModalComponentProps<undefined, undefined>,
): ReactNode {
  const { dismiss } = props;
  return (
    <ModalContentBoundary onDismiss={dismiss}>
      <FailingContent />
    </ModalContentBoundary>
  );
}
