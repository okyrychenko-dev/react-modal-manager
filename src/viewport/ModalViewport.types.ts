import type { ReactNode } from "react";
import type { ModalId, ModalInstanceId, ModalInstanceStatus } from "../types";

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

export interface ModalViewportProps {
  renderer?: ModalRenderer;
}
