import {
  ModalProvider,
  createModal,
  createModalRegistry,
  useOwnedModalHandles,
} from "@okyrychenko-dev/react-modal-manager";
import type {
  ConfirmModalResult,
  ModalComponentProps,
  ModalHandle,
  ModalInstanceId,
  ModalManager,
  ModalRendererProps,
  OwnedModalHandles,
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

const confirmation: ModalHandle<ConfirmModalResult> = manager.confirm({
  title: "Continue?",
});

const registryConfirmation: ModalHandle<ConfirmModalResult> = registry.confirm({
  title: "Registry confirmation",
});
const confirmationPromise: Promise<ConfirmModalResult> = confirmation;
const confirmationId: ModalInstanceId = confirmation.instanceId;
const registryConfirmationId: ModalInstanceId = registryConfirmation.instanceId;
const removals: Array<Promise<void>> = [
  handle.whenRemoved(),
  directInfoHandle.whenRemoved(),
  registryInfoHandle.whenRemoved(),
  confirmation.whenRemoved(),
  registryConfirmation.whenRemoved(),
];
void removals;
confirmation.dismiss();
registryConfirmation.dismiss("close-all");
void confirmation.then((result) => {
  if (!result.confirmed) {
    const reason: "cancel" | "dismiss" = result.reason;
    return reason;
  }
  return result.confirmed;
});
void confirmationPromise;
void confirmationId;
void registryConfirmationId;

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

declare const owner: OwnedModalHandles;
const tracked = owner.track(handle);
const trackedResult: Promise<RenameResult> = tracked;
const isActive: () => boolean = owner.captureLifetime();
owner.dismissAll();
// A plain promise must not be accepted in place of an owner-bound handle.
const acceptsPlainPromise: Promise<RenameResult> extends Parameters<
  OwnedModalHandles["track"]
>[0]
  ? true
  : false = false;
// The inferred result must not widen to an unrelated result type.
const returnsNumber: typeof tracked extends Promise<number> ? true : false =
  false;
void acceptsPlainPromise;
void returnsNumber;
void trackedResult;
void tracked;
void isActive;

const ownedHook: () => OwnedModalHandles = useOwnedModalHandles;
void ownedHook;
