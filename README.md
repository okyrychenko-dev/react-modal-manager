# @okyrychenko-dev/react-modal-manager

[![npm version](https://img.shields.io/npm/v/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![npm downloads](https://img.shields.io/npm/dm/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Open modals from anywhere and `await` their result — fully typed, with state isolated per `ModalProvider`.

`react-modal-manager` turns modal flows into typed promises. You `open()` a modal, `await` it, and TypeScript infers both the **input** you pass in and the **result** you get back — no `Promise<any>`, no global singleton, no design system lock-in.

```tsx
import { ModalProvider, useModalManager } from "@okyrychenko-dev/react-modal-manager";

function DeleteButton() {
  const modal = useModalManager();

  async function handleClick() {
    const { confirmed } = await modal.confirm({ title: "Delete report?", variant: "danger" });

    if (confirmed) {
      await deleteReport();
    }
  }

  return <button onClick={handleClick}>Delete</button>;
}

// Wrap the subtree once — that is the whole setup.
const app = (
  <ModalProvider>
    <DeleteButton />
  </ModalProvider>
);
```

## Why This Library

- **Typed results, not `any`.** `open<TInput, TResult>(def, input)` returns a `Promise<TResult>`. Both sides of the call are checked.
- **Per-provider isolation.** Each `ModalProvider` owns its own Zustand store — no global singleton, so subtrees and tests never leak modal state into each other.
- **Open from non-React code.** A typed registry (or controller) lets event buses, command palettes, and action maps open modals while keeping full inference.
- **UI-agnostic core.** A single `renderer` boundary lets you plug in portals, overlays, animations, or any design system. The core never prescribes DOM or styling.
- **Built-in `confirm()`** with a typed, discriminated-union result — useful from day one, replaceable when you need your own design.
- **Promise-shaped lifecycle.** Dismissals reject with `ModalDismissError`; exit animations are supported through `closeDelayMs` + an `"open" | "closing"` status.

### Compared to `nice-modal-react`

| | `react-modal-manager` | `nice-modal-react` |
| --- | --- | --- |
| Result typing | `Promise<TResult>`, fully inferred | result is effectively `unknown` / `any` |
| State scope | isolated per `ModalProvider` | single global singleton |
| Open from anywhere | typed registry / controller (LIFO provider stack) | global `NiceModal.show(id)` |
| Built-in confirm | typed `ConfirmModalResult` | none |
| UI coupling | UI-agnostic `renderer` boundary | you render it yourself |
| Concepts to first modal | 1 (`confirm`) — or define → register → open for custom modals | 1 (`show`) |

**Honest trade-off:** there is no "show a modal by string id from literally anywhere" without importing a typed `ModalDefinition` or a registry. That is the deliberate price of end-to-end type safety, not a missing feature.

## Installation

```bash
npm install @okyrychenko-dev/react-modal-manager zustand
# or
yarn add @okyrychenko-dev/react-modal-manager zustand
# or
pnpm add @okyrychenko-dev/react-modal-manager zustand
```

Peer dependencies:

- [React](https://react.dev/) `^18.0.0 || ^19.0.0`
- [Zustand](https://zustand-demo.pmnd.rs/) `^5.0.0`

There are **no runtime dependencies** beyond these peers — the provider-scoped store is built into the package.

## Quick Start

Wrap the part of your app that can open modals with `ModalProvider`, then call `useModalManager()` from any descendant.

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

  async function handleDelete() {
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
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```

## Type Safety

This is where the library earns its place. Define a modal once and every call site is checked end to end.

```tsx
import { createModal, type ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";

interface RenameInput {
  reportId: string;
  currentName: string;
}

type RenameResult =
  | { status: "renamed"; name: string }
  | { status: "cancelled" };

function RenameModal({ close, input }: ModalComponentProps<RenameInput, RenameResult>) {
  // `input` is RenameInput. `close` only accepts a RenameResult.
}

const renameModal = createModal({ component: RenameModal });

// At the call site, TypeScript infers everything:
const result = await modal.open(renameModal, { reportId: "1", currentName: "Q3" });
//    ^? RenameResult — discriminated union, narrowed by `result.status`
//                       and `modal.open` rejects the wrong input shape at compile time.
```

- `ModalComponentProps<TInput, TResult>` ties the component's `input` and `close` together.
- `modal.open(def, input)` rejects a mismatched `input` and returns `Promise<TResult>`.
- The registry infers input/result **from the key** (see below).
- `confirm()` returns a discriminated union, so `if (result.confirmed)` narrows the type.

## Typed Modal Flow

Define a modal with explicit input and result types.

```tsx
import { createModal, type ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import { useState } from "react";

interface RenameReportInput {
  reportId: string;
  currentName: string;
}

interface RenameReportSuccessResult {
  status: "renamed";
  name: string;
}

interface RenameReportCancelledResult {
  status: "cancelled";
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
  await renameReport({ reportId: report.id, name: result.name });
}
```

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

The handle's `dismiss()` stays bound to the provider that opened the modal.

## Typed Modal Registry

Use `createModalRegistry()` when code needs to open modals by a stable key while keeping typed input and result contracts. This suits command palettes, event buses, action maps, and configuration-driven flows. Pass the registry straight to `ModalProvider` — there is no controller to wire up.

```tsx
// modals.ts
import { createModal, createModalRegistry } from "@okyrychenko-dev/react-modal-manager";
import { RenameModal } from "./RenameModal";

export const modals = createModalRegistry({
  rename: createModal({ component: RenameModal }),
});
```

```tsx
// App.tsx
import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import { modals } from "./modals";

function App() {
  return (
    <ModalProvider registry={modals}>
      <ReportsPage />
    </ModalProvider>
  );
}
```

```tsx
// anywhere — including non-React code
export async function renameFromAction(reportId: string, currentName: string) {
  const result = await modals.open("rename", { reportId, currentName });

  if (result.status === "renamed") {
    await renameReport({ reportId, name: result.name });
  }
}
```

The registry key is type-checked, and TypeScript infers the required input and the returned result from the modal registered under that key. `modals.open` from outside the React tree targets the most recently mounted `ModalProvider` bound to that registry (providers form a LIFO stack and fall back on unmount).

## Confirmation Modals

`modal.confirm()` (and `registry.confirm()`) opens the built-in confirmation modal and resolves to a typed, discriminated-union result.

```tsx
const result = await modal.confirm({
  title: "Discard changes?",
  description: "Your edits will be lost.",
  variant: "warning",
});

if (result.confirmed) {
  discard();
} else {
  // result.reason is "cancel" | "dismiss"
}
```

The bundled `confirmModal` is a **minimal reference implementation** (semantic `role="dialog"` markup, no design system, no focus-trap). It is ideal for tests and simple flows; production apps usually supply their own confirm modal — see [Custom Confirm Modal](#custom-confirm-modal).

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

The core prescribes no DOM structure, focus management, or styling — adapters provide those while reusing the same lifecycle API. When `closeDelayMs` is greater than `0`, resolved or dismissed instances move from `modal.status === "open"` to `modal.status === "closing"` before removal, giving exit animations time to run.

## Recipes

### Next.js App Router (SSR)

The store is created lazily **per provider** (`useState(createModalStore)`) and lives in React context, so there is no module-level singleton and no shared state across requests — it is safe for the App Router and React Server Components. The provider uses hooks, so it must run in a Client Component. Wrap it once and render that wrapper from your server layout.

```tsx
// app/providers/modal-provider.tsx
"use client";

import { ModalProvider } from "@okyrychenko-dev/react-modal-manager";
import type { ReactNode } from "react";

export function AppModalProvider({ children }: { children: ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>;
}
```

```tsx
// app/layout.tsx (Server Component)
import { AppModalProvider } from "./providers/modal-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppModalProvider>{children}</AppModalProvider>
      </body>
    </html>
  );
}
```

Modal components and any component calling `useModalManager()` must also be Client Components (`"use client"`).

### Tailwind CSS

Provide the overlay and centering through the `renderer`, and style modal components with Tailwind utilities.

```tsx
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";

function TailwindRenderer({ children, modal }: ModalRendererProps) {
  return (
    <div
      data-status={modal.status}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50
                 transition-opacity data-[status=closing]:opacity-0"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}

<ModalProvider closeDelayMs={150} renderer={TailwindRenderer}>
  {children}
</ModalProvider>;
```

### shadcn/ui

Use a shadcn `Dialog` as the renderer shell, so every opened modal is wrapped in the design system's overlay and animations while your modal components stay focused on content.

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";

function ShadcnRenderer({ children, modal }: ModalRendererProps) {
  // `open` stays true while mounted; the library removes the instance after closeDelayMs.
  return (
    <Dialog open={modal.status === "open"}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

<ModalProvider closeDelayMs={200} renderer={ShadcnRenderer}>
  {children}
</ModalProvider>;
```

You can also build a fully custom confirm modal on shadcn's `AlertDialog` and pass it via the `confirmModal` prop — see below.

### React Hook Form inside a modal

A modal component is just a React component, so any form library works. Resolve the typed result by calling `close()` from the submit handler.

```tsx
import { useForm } from "react-hook-form";
import type { ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";

interface RenameValues {
  name: string;
}

function RenameForm({ input, close }: ModalComponentProps<{ currentName: string }, RenameValues>) {
  const { register, handleSubmit } = useForm<RenameValues>({
    defaultValues: { name: input.currentName },
  });

  return (
    <form onSubmit={handleSubmit((values) => close(values))}>
      <input {...register("name", { required: true })} />
      <button type="submit">Save</button>
    </form>
  );
}
```

### Custom Confirm Modal

Supply your own confirm implementation (design-system markup, a11y, focus management) and pass it to `confirmModal`. `modal.confirm()` then renders yours instead of the built-in reference.

```tsx
import { createModal, type ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";
import type { ConfirmModalParams, ConfirmModalResult } from "@okyrychenko-dev/react-modal-manager";

function MyConfirm(props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>) {
  const { input, close } = props;
  // render with your design system, then:
  // close({ confirmed: true })
  // close({ confirmed: false, reason: "cancel" })
}

const confirmModal = createModal({ id: "confirm", component: MyConfirm });

<ModalProvider confirmModal={confirmModal}>{children}</ModalProvider>;
```

## API Reference

### Public Exports

Runtime exports:

- `ModalProvider`
- `ModalViewport`
- `confirmModal`
- `createModal`
- `createModalRegistry`
- `useModalManager`
- `ModalDismissError`
- `ModalRejectError`

Type exports:

- `ConfirmModalParams`
- `ConfirmModalResult`
- `ConfirmModalVariant`
- `ModalComponent`
- `ModalComponentProps`
- `ModalDefinition`
- `ModalDismissReason`
- `ModalHandle`
- `ModalId`
- `ModalInstanceId`
- `ModalInstanceStatus`
- `ModalManager`
- `ModalOptions`
- `ModalProviderProps`
- `ModalRegistry`
- `ModalRegistryDefinitions`
- `ModalRegistryEntry`
- `ModalRegistryInput`
- `ModalRegistryResult`
- `ModalRenderer`
- `ModalRendererProps`
- `ModalRuntimeConfig`
- `ModalView`
- `ModalViewportProps`
- `RegisteredModalDefinition`

### `<ModalProvider>`

Creates an isolated modal manager for a React subtree and renders active modals.

**Props:**

- `children: ReactNode` — Application subtree that can access the modal manager
- `renderer?: ModalRenderer` — Optional wrapper for each rendered modal instance
- `confirmModal?: ModalDefinition<ConfirmModalParams, ConfirmModalResult>` — Optional custom confirm modal implementation
- `registry?: ModalRegistry` — Optional typed modal registry bound to this provider while it is mounted
- `closeDelayMs?: number` — Delay before removing a closing modal from the store. Defaults to `0`

### `useModalManager()`

Returns the modal manager from the nearest `ModalProvider`.

**Returns:**

- `open(modal, input): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`

### `createModal(options)`

Creates a typed modal definition.

**Options:**

- `id?: string` — Optional stable modal definition id. An internal debug id is generated when omitted
- `component: ModalComponent<TInput, TResult>` — React component that receives typed input and completion callbacks

### `createModalRegistry(definitions)`

Creates a typed registry for opening modals by key. Bind it directly with `<ModalProvider registry={registry}>`.

**Returns:**

- `open(key, input): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`
- `isReady(): boolean`

### `ModalComponentProps<TInput, TResult>`

Props passed to custom modal components.

- `input: TInput` — Input supplied to `modal.open()`
- `instanceId: string` — Runtime modal instance id
- `close(result: TResult): void` — Resolve the modal promise and remove the instance
- `dismiss(reason?): void` — Reject with `ModalDismissError` and remove the instance
- `reject(error): void` — Reject with an error and remove the instance

When `closeDelayMs` is configured, `close`, `dismiss`, and `reject` settle the promise immediately, mark the modal as `"closing"`, and remove it after the delay.

### `ModalRendererProps`

Props passed to the `renderer` boundary.

- `children: ReactNode` — Rendered modal component
- `modal.definitionId: string` — Stable modal definition id
- `modal.instanceId: string` — Runtime modal instance id
- `modal.status: "open" | "closing"` — Lifecycle status for entry/exit rendering

### `confirm(params)`

Opens the built-in (or provided) confirmation modal.

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
npm run lint
npm run test:run
npm run build
```

## License

MIT © [Oleksii Kyrychenko](https://github.com/okyrychenko-dev)
