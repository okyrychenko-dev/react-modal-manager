import {
  ModalProvider,
  createModal,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import type {
  ConfirmModalResult,
  ModalComponentProps,
  ModalHandle,
  ModalManager,
  ModalRendererProps,
} from "@okyrychenko-dev/react-modal-manager";
import type { ComponentProps, ReactNode } from "react";

interface RenameInput {
  currentName: string;
}

type RenameResult =
  | { name: string; status: "renamed" }
  | { status: "cancelled" };

function RenameModal({
  input,
}: ModalComponentProps<RenameInput, RenameResult>): ReactNode {
  input.currentName satisfies string;
  return null;
}

const renameModal = createModal<RenameInput, RenameResult>({
  component: RenameModal,
});
const registry = createModalRegistry({ rename: renameModal });
const handle: ModalHandle<RenameResult> = registry.open("rename", {
  currentName: "Quarterly report",
});

// @ts-expect-error The packed declarations must reject invalid modal input.
registry.open("rename", { reportName: "Quarterly report" });

declare const manager: ModalManager;
const confirmation: Promise<ConfirmModalResult> = manager.confirm({
  title: "Continue?",
});

function Renderer({ children, modal }: ModalRendererProps): ReactNode {
  modal.status satisfies "open" | "closing";
  return children;
}

const providerProps: ComponentProps<typeof ModalProvider> = {
  children: null,
  renderer: Renderer,
};

void confirmation;
void handle;
void providerProps;
