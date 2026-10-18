"use client";

import { DialogRenderer } from "./DialogRenderer";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function CustomerFlowRenderer(props: ModalRendererProps): ReactNode {
  return <DialogRenderer {...props} returnFocusId="customer-flow-start" />;
}
