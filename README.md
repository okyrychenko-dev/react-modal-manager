# @okyrychenko-dev/react-modal-manager

[![npm version](https://img.shields.io/npm/v/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![npm downloads](https://img.shields.io/npm/dm/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Open typed modal and dialog flows from React components with promise-based results

## What This Library Does

`react-modal-manager` provides a UI-agnostic modal lifecycle layer for React applications. It manages modal instances, typed input and result contracts, confirmation flows, custom renderers, and isolated provider state without coupling the core package to a design system.

## Why Use It

- Open custom modals with fully typed input and result values
- Model modal flows as promises instead of string-based global registries
- Open modals from non-React code through a provider-bound controller when needed
- Use `confirm()` for common confirmation flows without action-specific coupling
- Keep modal stacks isolated per `ModalProvider` through Zustand-backed provider state
- Render modals through any UI library with the `renderer` boundary
- Build future adapters for MUI, HeroUI, Radix, Ant Design, or action-guard integrations on top of the same core

## Installation

```bash
npm install @okyrychenko-dev/react-modal-manager zustand
# or
yarn add @okyrychenko-dev/react-modal-manager zustand
# or
pnpm add @okyrychenko-dev/react-modal-manager zustand
```

This package requires the following peer dependencies:

- [React](https://react.dev/) ^18.0.0 || ^19.0.0
- [Zustand](https://zustand-demo.pmnd.rs/) ^5.0.0

`@okyrychenko-dev/react-zustand-toolkit` is used internally for scoped store providers and resolved Zustand hooks.

## Quick Start

Wrap the part of your app that can open modals with `ModalProvider`, then call `useModalManager()` from descendants.

```tsx
import { ModalProvider, useModalManager } from "@okyrychenko-dev/react-modal-manager";

function App() {
  return (
    <ModalProvider>
      <ReportsPage />
    </ModalProvider>
  );
}

function ReportsPage() {
  const modal = useModalManager();

  const handleDelete = async () => {
    const result = await modal.confirm({
      title: "Delete report?",
      description: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!result.confirmed) {
      return;
    }

    await deleteReport();
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

## Core Concepts

- `ModalProvider` creates an isolated modal store for its React subtree
- `useModalManager` exposes the modal controller for descendants
- `createModal` defines a typed modal component contract
- `createModalController` creates an optional external controller that can be bound to a provider
- `modal.open(modalDefinition, input)` returns a modal handle that is also a promise for the modal result
- `modal.confirm(params)` opens the built-in confirmation modal
- `modal.dismiss(id)` rejects one active modal promise with `ModalDismissError`
- `modal.closeAll()` rejects all active modal promises and closes the stack
- `renderer` lets adapters wrap modal content with portals, overlays, design-system shells, or animation layers
- `closeDelayMs` keeps closing modal instances mounted long enough for renderer-driven exit animations

## Typed Modal Flow

Define a modal with explicit input and result types.

```tsx
import {
  createModal,
  type ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";

interface RenameReportInput {
  reportId: string;
  currentName: string;
}

interface RenameReportSuccessResult {
  status: 'renamed';
  newName: string;
}

interface RenameReportCancelledResult {
  status: 'cancelled';
}

type RenameReportResult =
  | RenameReportSuccessResult
  | RenameReportCancelledResult;

function RenameReportModal({
  close,
  input,
}: ModalComponentProps<RenameReportInput, RenameReportResult>) {
  const [name, setName] = useState(input.currentName);

  return (
    <dialog open>
      <h2>Rename report</h2>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <button onClick={() => close({ status: "cancelled" })}>Cancel</button>
      <button onClick={() => close({ status: "renamed", name })}>Rename</button>
    </dialog>
  );
}

export const renameReportModal = createModal<RenameReportInput, RenameReportResult>({
  id: "rename-report",
  component: RenameReportModal,
});
```

Open it from any descendant of `ModalProvider`.

```tsx
const result = await modal.open(renameReportModal, {
  reportId: report.id,
  currentName: report.name,
});

if (result.status === "renamed") {
  await renameReport({
    reportId: report.id,
    name: result.name,
  });
}
```

TypeScript validates both the input passed to `open()` and the result returned from the modal.

`modal.open()` rejects with `ModalDismissError` when the modal is dismissed, `closeAll()` is called, or the provider unmounts while the modal is still pending. Use `try/catch` or `.catch()` when a modal can be dismissed without resolving a result.

Keep the handle returned by `open()` when the caller needs to identify or dismiss the specific modal instance later:

```tsx
const handle = modal.open(renameReportModal, {
  reportId: report.id,
  currentName: report.name,
});

handle.instanceId;
handle.dismiss();

const result = await handle;
```

The handle's `dismiss()` function remains bound to the provider that opened the modal.

## Provider-Bound Controller

Use `createModalController()` when a modal flow must be started outside a React component, for example from a command handler, event bus, store action, or integration layer. The controller is still bound to a concrete `ModalProvider`, so state remains isolated instead of becoming a global singleton.

```tsx
import {
  ModalProvider,
  createModalController,
} from "@okyrychenko-dev/react-modal-manager";
import { renameReportModal } from "./renameReportModal";

export const appModalController = createModalController();

function App() {
  return (
    <ModalProvider controller={appModalController}>
      <ReportsPage />
    </ModalProvider>
  );
}

export async function renameFromCommand(reportId: string, currentName: string) {
  const result = await appModalController.open(renameReportModal, {
    reportId,
    currentName,
  });

  if (result.status === "renamed") {
    await renameReport({
      reportId,
      name: result.name,
    });
  }
}
```

Calling the controller before its provider is mounted throws an error. Use `controller.isReady()` if an integration can run before the React tree is ready.

If the same controller is bound to multiple mounted providers, calls are routed to the most recently mounted provider. When that provider unmounts, the controller falls back to the previous mounted provider.

## Typed Modal Registry

Use `createModalRegistry()` when code needs to open modals by a stable key while keeping typed input and result contracts. This is useful for command palettes, event buses, action maps, and configuration-driven flows.

```tsx
import {
  ModalProvider,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
import { renameReportModal } from "./renameReportModal";

export const modalRegistry = createModalRegistry({
  renameReport: renameReportModal,
});

function App() {
  return (
    <ModalProvider controller={modalRegistry.controller}>
      <ReportsPage />
    </ModalProvider>
  );
}

export async function renameFromAction(reportId: string, currentName: string) {
  const result = await modalRegistry.open("renameReport", {
    reportId,
    currentName,
  });

  if (result.status === "renamed") {
    await renameReport({
      reportId,
      name: result.name,
    });
  }
}
```

The registry key is type-checked, and TypeScript infers the required input and returned result from the modal definition registered under that key.

## Custom Renderer

Use `renderer` when your application needs portals, overlays, animation wrappers, or design-system primitives.

```tsx
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";

function AppModalRenderer({ children, modal }: ModalRendererProps) {
  return (
    <div data-modal-id={modal.instanceId} data-status={modal.status} role="presentation">
      {children}
    </div>
  );
}

function App() {
  return (
    <ModalProvider closeDelayMs={200} renderer={AppModalRenderer}>
      <ReportsPage />
    </ModalProvider>
  );
}
```

The core package does not prescribe DOM structure, focus management, or styling. UI adapters can provide those concerns while reusing the same lifecycle API. When `closeDelayMs` is greater than `0`, resolved or dismissed modal instances move from `modal.status === "open"` to `modal.status === "closing"` before they are removed.

The built-in `confirmModal` is a minimal reference implementation. It is useful for tests and simple flows, but production applications should usually provide a design-system confirm modal through `confirmModal` or a UI adapter.

## API Reference

### Public Exports

Runtime exports:

- `ModalProvider`
- `ModalViewport`
- `confirmModal`
- `createModal`
- `createModalController`
- `useModalManager`
- `ModalDismissError`
- `ModalRejectError`

Type exports:

- `ConfirmModalParams`
- `ConfirmModalResult`
- `ConfirmModalVariant`
- `ModalComponent`
- `ModalComponentProps`
- `ModalController`
- `ModalDefinition`
- `ModalDismissReason`
- `ModalId`
- `ModalInstanceId`
- `ModalInstanceStatus`
- `ModalManager`
- `ModalHandle`
- `ModalProviderProps`
- `ModalRenderer`
- `ModalRendererProps`
- `ModalRuntimeConfig`
- `ModalView`
- `ModalViewportProps`

### `<ModalProvider>`

Creates an isolated modal manager for a React subtree and renders active modals.

**Props:**

- `children: ReactNode` - Application subtree that can access the modal manager
- `renderer?: ModalRenderer` - Optional wrapper for each rendered modal instance
- `confirmModal?: ModalDefinition<ConfirmModalParams, ConfirmModalResult>` - Optional custom confirm modal implementation
- `controller?: ModalController` - Optional external controller bound to this provider while it is mounted
- `closeDelayMs?: number` - Delay before removing a closing modal from the store. Defaults to `0`

### `useModalManager()`

Returns the modal controller from the nearest `ModalProvider`.

**Returns:**

- `open(modal, input): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`

### `createModal(definition)`

Creates a typed modal definition.

**Parameters:**

- `id: string` - Stable modal definition id
- `component: ModalComponent<TInput, TResult>` - React component that receives typed input and completion callbacks

### `createModalRegistry(definitions)`

Creates a typed registry for opening modals by key through a provider-bound controller.

**Returns:**

- `controller: ModalController` - Pass this to `<ModalProvider controller={registry.controller}>`
- `open(key, input): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`
- `isReady(): boolean`

### `createModalController()`

Creates a provider-bound controller for opening typed modal definitions outside `useModalManager()`.

**Returns:**

- `open(modal, input): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`
- `isReady(): boolean`
- `bind(manager): VoidFunction` - Low-level binding used by `ModalProvider`; most applications should pass the controller through the `controller` prop instead of calling this directly

**Limitations:**

- A single controller bound to multiple `<ModalProvider>` instances mounted simultaneously uses the most-recently-mounted provider (last-bind-wins). For isolated modal stacks, create separate controllers per provider or use one controller within a single provider tree.

### `ModalComponentProps<TInput, TResult>`

Props passed to custom modal components.

- `input: TInput` - Input supplied to `modal.open()`
- `instanceId: string` - Runtime modal instance id
- `close(result: TResult): void` - Resolve the modal promise and remove the instance
- `dismiss(reason?): void` - Reject with `ModalDismissError` and remove the instance
- `reject(error): void` - Reject with an error and remove the instance

When `closeDelayMs` is configured, `close`, `dismiss`, and `reject` settle the promise immediately, mark the modal as `"closing"`, and remove it after the delay.

### `ModalRendererProps`

Props passed to the `renderer` boundary.

- `children: ReactNode` - Rendered modal component
- `modal.definitionId: string` - Stable modal definition id
- `modal.instanceId: string` - Runtime modal instance id
- `modal.status: "open" | "closing"` - Lifecycle status for entry/exit rendering

### `confirm(params)`

Opens the built-in confirmation modal.

**Parameters:**

- `title: ReactNode`
- `description?: ReactNode`
- `confirmText?: string`
- `cancelText?: string`
- `variant?: "default" | "danger" | "warning" | "success"`
- `dismissible?: boolean`

**Returns:**

```ts
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
```

### `ModalDismissError`

Thrown when a modal is dismissed by `dismiss()`, `closeAll()`, or provider unmount.

**Properties:**

- `reason: "dismiss" | "close-all" | "provider-unmount"`

### `ModalRejectError`

Thrown when a modal calls `reject()` with a non-`Error` value. The original value is available as `error.value`.

## Package Boundary

This package intentionally does not know about guarded actions, permissions, pending state, or action execution. It is the base modal/dialog lifecycle layer.

Action-aware flows should be built in a separate integration package on top of this API:

```txt
react-modal-manager
  -> typed modal opening, confirmation, dismissal, lifecycle

react-action-guard-dialog
  -> confirm and run guarded actions through react-modal-manager
```

## Development

```bash
npm install
npm run typecheck
npm run test:run
npm run build
```

## License

MIT © [Oleksii Kyrychenko](https://github.com/okyrychenko-dev)
