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

declare const manager: ModalManager;

const handle: ModalHandle<RenameResult> = registry.open("rename", {
  currentName: "Quarterly report",
});

// @ts-expect-error The packed declarations must reject invalid modal input.
registry.open("rename", { reportName: "Quarterly report" });

// @ts-expect-error A modal with required input cannot be opened without it.
manager.open(renameModal);
// @ts-expect-error A registry entry with required input cannot be opened without it.
registry.open("rename");

type EmptyModalValue = ReturnType<VoidFunction>;

function InfoModal(
  _: ModalComponentProps<EmptyModalValue, EmptyModalValue>,
): ReactNode {
  return null;
}

const infoModal = createModal<EmptyModalValue, EmptyModalValue>({
  component: InfoModal,
});
const infoRegistry = createModalRegistry({ info: infoModal });
const directInfoHandle: ModalHandle<EmptyModalValue> = manager.open(infoModal);
const registryInfoHandle: ModalHandle<EmptyModalValue> =
  infoRegistry.open("info");

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
void directInfoHandle;
void handle;
void registryInfoHandle;
void providerProps;
