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
    const result = await modal.confirm({ title: "Delete report?", variant: "danger" });

    if (result.confirmed) {
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

- **Typed results, not `any`.** `open<TInput, TResult>(def, input)` returns a `Promise<TResult>`. Both sides of the call are checked, and inputless modals can omit the argument.
- **Per-provider isolation.** Each `ModalProvider` owns an independent lifecycle whose authoritative state React observes directly — no global lifecycle singleton, so subtrees and tests never leak modal state into each other.
- **Open from non-React code.** A typed registry lets event buses, command palettes, and action maps open modals while keeping full inference.
- **UI-agnostic core.** A single `renderer` seam lets you plug in portals, overlays, animations, or any design system. The core never prescribes DOM or styling.
- **Built-in `confirm()`** with a typed, discriminated-union result — useful from day one, replaceable when you need your own design.
- **Promise-shaped lifecycle.** Programmatic dismissal and provider teardown reject with `ModalDismissError`; built-in confirmation Cancel/Escape resolve as typed results. Exit animations are supported through `closeDelayMs` + an `"open" | "closing"` status.

## Choose the API

| Need | Use | Outcome |
| --- | --- | --- |
| Yes/no decision | `modal.confirm(params)` | `{ confirmed: true }` or `{ confirmed: false, reason: "cancel" | "dismiss" }` for the built-in UI |
| A form or custom workflow | `modal.open(definition, input)` | The result you pass to `close(result)`; `dismiss()` rejects |
| Open a modal from a command or other non-React code | `createModalRegistry()` | The same typed result and dismissal behavior |
| Design-system dialog shell | `<ModalProvider renderer={...}>` | Wraps every modal, including `confirm()` |

**Important:** Cancel and Escape in the *built-in confirmation UI* resolve with `confirmed: false`. Calls to `dismiss()`, `closeAll()`, and provider unmount reject with `ModalDismissError`, including for `confirm()`. For custom modals, your component chooses whether a Cancel button calls `close({ ... })` or `dismiss()`. See [Outcomes and cleanup](#outcomes-and-cleanup).

## Installation

```bash
npm install @okyrychenko-dev/react-modal-manager
# or
yarn add @okyrychenko-dev/react-modal-manager
# or
pnpm add @okyrychenko-dev/react-modal-manager
```

Peer dependencies:

- [React](https://react.dev/) `^18.0.0 || ^19.0.0`

Modal lifecycle state is provider-owned and observed directly by React. There is no global lifecycle singleton.

The package also installs its small runtime guard dependency automatically; React is the only peer dependency consumers provide.

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

    if (result.confirmed) {
      await deleteReport();
    }
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```

## Adoption Path

Start with the smallest API that solves the current problem, then add the next capability only when the application needs it:

1. Use [`confirm()`](#confirmation-modals) for a typed yes/no decision.
2. Define a [typed custom modal](#typed-modal-flow) when the flow needs application-specific input, UI, or results.
3. Keep the returned [modal handle](#typed-modal-flow) when the caller must identify or dismiss that exact instance.
4. Add a [typed registry](#typed-modal-registry) for commands that originate outside React.
5. Supply a [custom renderer](#custom-renderer) for overlays, portals, design-system shells, and exit animations.
6. Split independent application areas into [provider scopes](#provider-scope).
7. Follow the [Next.js App Router guidance](#nextjs-app-router-ssr) for SSR and React Server Components.

The complete path is compile-checked as a package consumer in [`examples/adoption-paths.typecheck.tsx`](examples/adoption-paths.typecheck.tsx). The client boundary used by a server layout is checked separately in [`examples/next-app-router-provider.typecheck.tsx`](examples/next-app-router-provider.typecheck.tsx). Interactive equivalents live in Storybook under `Components/confirmModal`, `Context/ModalProvider`, and `Components/ModalViewport`.

## Type Safety

This is where the library earns its place. Define a modal once and every call site is checked end to end.

```tsx
import { createModal, type ModalComponentProps } from "@okyrychenko-dev/react-modal-manager";

interface RenameInput {
  reportId: string;
  currentName: string;
}

interface RenameSucceededResult {
  status: "renamed";
  name: string;
}

interface RenameCancelledResult {
  status: "cancelled";
}

type RenameResult = RenameSucceededResult | RenameCancelledResult;

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

`modal.open()` rejects with `ModalDismissError` when the modal is dismissed, `closeAll()` is called, or the provider unmounts while it is still pending. Handle that branch explicitly in the caller. TypeScript checks the resolved result but does not encode a promise's rejection type.

```tsx
import { ModalDismissError } from "@okyrychenko-dev/react-modal-manager";

async function renameReportWithModal(modal: ReturnType<typeof useModalManager>) {
  try {
    const result = await modal.open(renameReportModal, {
      reportId: "report-1",
      currentName: "Draft",
    });

    if (result.status === "renamed") {
      await renameReport({ reportId: "report-1", name: result.name });
    }
  } catch (error) {
    if (error instanceof ModalDismissError) {
      return;
    }
    throw error;
  }
}
```

Keep the handle returned by `open()` when the caller needs to identify or dismiss the specific modal instance later:

```tsx
const handle = modal.open(renameReportModal, {
  reportId: report.id,
  currentName: report.name,
});

handle.instanceId;
try {
  handle.dismiss(); // Rejects this handle with ModalDismissError.
  const result = await handle;
  // Use result here if another action resolved the modal first.
} catch (error) {
  if (!(error instanceof ModalDismissError)) {
    throw error;
  }
}
```

The handle's `dismiss()` stays bound to the provider that opened the modal. Attach a rejection handler before dismissing a handle you will no longer await.

For a modal that needs no input, declare its input as `void` and omit the second argument:

```tsx
const infoModal = createModal<void, void>({ component: InfoModal });

await modal.open(infoModal);
```

Modals with any other input type still require an input argument.

## Outcomes and cleanup

The promise settles **once**. The first `close(result)`, `reject(error)`, or `dismiss(reason)` changes the instance to `"closing"`; later settlement calls for that instance are ignored. `closeDelayMs` delays removal for an exit animation, but the promise settles immediately.

| Action | Promise outcome | When to use it |
| --- | --- | --- |
| `close(result)` | Resolves with typed `result` | A completed flow or an expected result such as Cancel |
| `reject(error)` | Rejects with `error` (non-`Error` values become `ModalRejectError`) | An operation failed |
| `dismiss(reason?)` | Rejects with `ModalDismissError` | A custom modal is abandoned without a result |
| `modal.dismiss(id)` / `handle.dismiss()` | Rejects with `ModalDismissError("dismiss")` by default | Close one pending modal externally |
| `modal.closeAll()` | Rejects every open modal with reason `"close-all"` | Tear down a modal stack |
| Provider unmount | Rejects every pending modal with reason `"provider-unmount"` | Automatic cleanup of the provider's lifecycle |

A **calling component** unmounting does not automatically cancel a modal owned by a provider higher in the tree. The promise stays pending until that modal settles or its provider unmounts. If the caller owns the modal's lifetime, track every active handle and dismiss each in effect cleanup; also handle the resulting rejections:

```tsx
import { useEffect, useRef } from "react";
import {
  ModalDismissError,
  useModalManager,
  type ModalHandle,
} from "@okyrychenko-dev/react-modal-manager";

function RenameLauncher() {
  const modal = useModalManager();
  const pending = useRef(new Set<ModalHandle<RenameReportResult>>());

  useEffect(() => {
    const handles = pending.current;

    return () => {
      for (const handle of handles) {
        handle.dismiss();
      }
      handles.clear();
    };
  }, []);

  async function handleClick() {
    const handle = modal.open(renameReportModal, {
      reportId: "report-1",
      currentName: "Draft",
    });
    pending.current.add(handle);

    try {
      const result = await handle;
      if (result.status === "renamed") {
        await renameReport({ reportId: "report-1", name: result.name });
      }
    } catch (error) {
      if (!(error instanceof ModalDismissError)) {
        throw error;
      }
    } finally {
      pending.current.delete(handle);
    }
  }

  return <button onClick={handleClick}>Rename</button>;
}
```

Each click adds a separate handle to the set. The `finally` block removes it when the flow completes, and unmount cleanup dismisses all remaining handles, including concurrent launches.

This cleanup is optional: it expresses the caller's ownership policy. For operations that must survive the initiating component, keep the provider mounted and let another owner observe the result. React 18/19 Strict Mode effect replay is covered by the provider's lifecycle tests; provider teardown is deferred and canceled if the same owner immediately remounts.

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

Before a provider binds the registry, `modals.isReady()` is `false` and registry operations throw. Binding happens in a client effect, so a registry is intentionally unbound during server rendering.

## Provider Scope

Each `ModalProvider` owns an independent lifecycle. `useModalManager()` always targets the nearest provider, so adjacent or nested application areas can keep their modal state, renderers, and teardown behavior isolated. A handle remains bound to the provider that created it, even when another provider opens the same modal definition.

Use a separate registry for each strictly isolated scope. Binding the same registry to multiple providers is a deliberate routing mechanism instead: external calls target the most recently mounted binding and fall back to the previous binding when it unmounts.

```tsx
const accountModals = createModalRegistry({ rename: renameReportModal });
const workspaceModals = createModalRegistry({ rename: renameReportModal });

function App() {
  return (
    <>
      <ModalProvider registry={accountModals} renderer={AccountModalRenderer}>
        <AccountSettings />
      </ModalProvider>
      <ModalProvider registry={workspaceModals} renderer={WorkspaceModalRenderer}>
        <Workspace />
      </ModalProvider>
    </>
  );
}
```

## Confirmation Modals

`modal.confirm()` (and `registry.confirm()`) opens the built-in confirmation modal and normally resolves to a typed, discriminated-union result. The Confirm button returns `{ confirmed: true }`; Cancel returns `{ confirmed: false, reason: "cancel" }`; Escape and the built-in Dismiss button return `{ confirmed: false, reason: "dismiss" }` when dismissal is allowed. These UI actions call `close(result)`, not the lifecycle `dismiss()`. Programmatic dismissal, `closeAll()`, and provider unmount still reject with `ModalDismissError`.

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

The bundled `confirmModal` is an **accessible, unstyled reference implementation**:

- `role="dialog"` with `aria-modal="true"`, `aria-labelledby` (title) and `aria-describedby` (description)
- the confirm button receives focus on open (the cancel button for `variant: "danger"`, so a stray Enter never confirms a destructive action), and focus returns to the previously focused element when the modal is removed
- `Tab` / `Shift+Tab` are trapped within the dialog
- `Escape` dismisses it (unless `dismissible: false`)

It ships no styling and no portal — those belong to your `renderer` or design system. It is ideal for tests and simple flows; production apps usually supply their own confirm modal — see [Custom Confirm Modal](#custom-confirm-modal).

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

Every modal instance goes through this renderer, including the built-in `confirm()` and custom modals. A renderer can provide a shell or portal; it does not replace the confirmation component. Pass `confirmModal={yourDefinition}` to `ModalProvider` to replace that UI. If the renderer already provides dialog semantics (for example, Radix `DialogContent`), make the custom confirmation content-only to avoid nested dialogs.

The core prescribes no DOM structure, focus management, or styling for custom modals — renderers and components provide those while reusing the same manager interface. When `closeDelayMs` is greater than `0`, resolved, dismissed, or rejected instances move from `modal.status === "open"` to `modal.status === "closing"` before removal, giving exit animations time to run. A value of `0` or less removes the instance immediately. Updating the prop changes the removal delay used by later settlements in that provider.

## Recipes

### Next.js App Router (SSR)

The lifecycle is created lazily **per provider**, lives in React context, and exposes its state directly to React through external-store observation. It owns opening, settlement, dismissal, delayed removal, and disposal. Server rendering reads a stable empty snapshot, and there is no module-level singleton or shared state across requests. The provider uses hooks, so it must run in a Client Component. Wrap it once and render that wrapper from your server layout.

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

Opening modal work while React is rendering on the server is unsupported. The server snapshot is intentionally empty: open modals from event handlers, effects, command handlers, or other client-side code after hydration. A registry likewise remains unbound until its provider's client effect runs, so check `registry.isReady()` before dispatching startup commands from outside React.

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

### shadcn/ui (Radix)

Use the current [Radix-based shadcn `Dialog`](https://ui.shadcn.com/docs/components/radix/dialog) as a controlled renderer shell, so every opened modal is wrapped in the design system's overlay and animations. Route `onOpenChange(false)` back to the modal manager so Escape, outside interaction, and shadcn's generated close button dismiss the correct instance.

```tsx
import {
  type ModalRendererProps,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function ShadcnRenderer({ children, modal }: ModalRendererProps) {
  const modalManager = useModalManager();

  function handleOpenChange(open: boolean) {
    if (!open && modal.status === "open") {
      modalManager.dismiss(modal.instanceId);
    }
  }

  return (
    <Dialog
      open={modal.status === "open"}
      onOpenChange={handleOpenChange}
    >
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

<ModalProvider closeDelayMs={200} renderer={ShadcnRenderer}>
  {children}
</ModalProvider>;
```

This provider-wide renderer is for content-only custom modals. Each modal rendered inside `DialogContent` must compose shadcn's `DialogHeader`, `DialogTitle`, and, when useful, `DialogDescription`; otherwise Radix cannot establish the accessible title/description relationship.

Do not use the built-in confirmation modal with this renderer: it already owns its dialog semantics, so wrapping it in `DialogContent` would create nested dialogs and omit Radix's required `DialogTitle`. If this provider calls `confirm()`, pass a content-only custom `confirmModal` that composes `DialogHeader`, `DialogTitle`, and `DialogDescription` inside this existing shell. Do not nest another `Dialog` or `AlertDialog` in it.

Match `closeDelayMs` to your generated component's exit-animation duration. The example uses 200 ms, matching the current [Radix-based component's `duration-200`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/dialog.tsx).

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
- `ModalOpenArgs`
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
- `closeDelayMs?: number` — Delay before removing a closing lifecycle instance. Values of `0` or less remove immediately. Defaults to `0`; prop updates apply to later settlements

### `useModalManager()`

Returns the modal manager from the nearest `ModalProvider`.

**Returns:**

- `open(modal, ...args: ModalOpenArgs<TInput>): ModalHandle<TResult>`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`

### `createModal(options)`

Creates a typed modal definition.

**Options:**

- `id?: string` — Optional stable modal definition id. A unique definition id is generated when omitted
- `component: ModalComponent<TInput, TResult>` — React component that receives typed input and completion callbacks

For a modal declared with `TInput = void` (or `undefined`), omit the input argument: `modal.open(infoModal)`. Modals with any other input type still require it.

### `createModalRegistry(definitions)`

Creates a typed registry for opening modals by key. Bind it directly with `<ModalProvider registry={registry}>`.

**Returns:**

- `open(key, ...args: ModalOpenArgs<TInput>): ModalHandle<TResult>` — input is optional only when the registered modal uses `void` or `undefined`
- `confirm(params): Promise<ConfirmModalResult>`
- `dismiss(instanceId, reason?): void`
- `closeAll(reason?): void`
- `isReady(): boolean`

### `ModalComponentProps<TInput, TResult>`

Props passed to custom modal components.

- `input: ModalOpenArgs<TInput>[0]` — Input supplied to `modal.open()`; `undefined` when a `void` input is omitted
- `instanceId: string` — Runtime modal instance id
- `close(result: TResult): void` — Resolve the modal promise and begin closing the instance
- `dismiss(reason?): void` — Reject with `ModalDismissError` and begin closing the instance
- `reject(error): void` — Reject with an error and begin closing the instance

When `closeDelayMs` is greater than `0`, `close`, `dismiss`, and `reject` settle the promise immediately, mark the modal as `"closing"`, and remove it after the delay. A value of `0` or less removes the instance immediately after settlement.

### `ModalRendererProps`

Props passed to the `renderer` seam.

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

`ConfirmModalResult` is a discriminated union. Its structure is shown with named branches below so the successful and cancelled paths remain explicit; only `ConfirmModalResult` is exported from the package root.

```ts
type ConfirmationModalRejectReason = "cancel" | "dismiss";

interface ConfirmationModalConfirmedResult {
  confirmed: true;
}

interface ConfirmationModalRejectedResult {
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

### Compared to [`@ebay/nice-modal-react`](https://github.com/eBay/nice-modal-react)

Revalidated **2026-09-13** for this package's **0.2.0** release line (through `3a98aa8`) and the current stable [`@ebay/nice-modal-react` 1.2.13](https://www.npmjs.com/package/@ebay/nice-modal-react/v/1.2.13). “Verified behavior” below means an executable public-surface check; “architecture” describes source structure and is not itself a consumer guarantee.

| Area | `react-modal-manager` | `nice-modal-react` | Evidence kind |
| --- | --- | --- | --- |
| Input and result typing | A definition or registry key couples input to `Promise<TResult>` | Component props are inferred; `show()` result is caller-selected and handlers expose `Promise<unknown>` | Verified declarations: [local packed-consumer fixture](scripts/package-consumer.typecheck.ts), [Nice Modal 1.2.13 declarations](https://unpkg.com/@ebay/nice-modal-react@1.2.13/lib/esm/index.d.ts) |
| Lifecycle correctness | Per-instance handles; resolve, reject, and dismiss settle once; optional closing phase precedes removal | Promise-based `show`; separate `hide` and `remove`; UI-library helpers connect removal to exit callbacks | Verified local behavior: [lifecycle tests](src/lifecycle/__tests__/modalLifecycle.test.ts); documented competitor behavior: [Nice Modal usage and helpers](https://github.com/eBay/nice-modal-react/tree/1.2.13#usage) |
| Provider isolation | Nested, adjacent, and independent roots own isolated lifecycle state | Each provider creates reducer state, while imperative dispatch, registrations, and promise callbacks are module-level | Verified local behavior: [root tests](src/provider/__tests__/ModalProvider.roots.test.tsx); competitor architecture: [1.2.13 source](https://github.com/eBay/nice-modal-react/blob/1.2.13/src/index.tsx) |
| React compatibility | Declares React 18 and 19 and runs the same root/Strict Mode suite against both | Declares React and React DOM `>16.8.0`; the published package was developed with React 17 | Verified local matrix: [CI](.github/workflows/ci.yml); published competitor metadata: [package manifest](https://unpkg.com/@ebay/nice-modal-react@1.2.13/package.json) |
| SSR and RSC | Provider server rendering, separate-request isolation, and hydration are tested; RSC usage has a compiled Client Component example | No SSR, hydration, or React Server Components contract is documented in the 1.2.13 README | Verified local behavior: [SSR tests](src/provider/__tests__/ModalProvider.ssr.test.tsx) and [RSC-style fixture](examples/next-app-router-provider.typecheck.tsx); competitor documentation: [1.2.13 README](https://github.com/eBay/nice-modal-react/tree/1.2.13) |
| Imperative access | A typed registry opens outside React after being bound to a provider; keys, input, and results are inferred | `NiceModal.show(component, props)` or a registered string id can be called directly after a provider establishes the module-level dispatch | Verified local behavior: [registry tests](src/registry/__tests__/createModalRegistry.test.tsx); documented competitor behavior: [component and id APIs](https://github.com/eBay/nice-modal-react/tree/1.2.13#using-your-modal-component) |
| Rendering independence | Lifecycle renders modal definitions through a replaceable wrapper; no portal, overlay, CSS, or design-system dependency | Supplies no dialog markup and wraps consumer components; includes helpers for Ant Design, MUI, and React Bootstrap lifecycles | Public interfaces: [local renderer types](src/types/modal.ts), [Nice Modal helpers](https://unpkg.com/@ebay/nice-modal-react@1.2.13/lib/esm/index.d.ts) |
| Accessibility composition | Built-in confirmation provides dialog semantics, initial focus, focus trapping, and safe destructive focus; custom modals/renderers remain consumer-owned | Accessibility belongs entirely to the consumer’s chosen modal component or UI library | Verified local behavior: [confirmation tests](src/confirm/__tests__/ConfirmModal.test.tsx); documented competitor scope: [“not a React modal component”](https://github.com/eBay/nice-modal-react/tree/1.2.13#nice-modal) |
| First-use ergonomics | `confirm()` is the shortest path; custom flows define a modal and open it directly or through a registry | `show(component, props)` is the shortest path; string access adds `register(id, component)` | Documented public APIs: [this README](#quick-start), [Nice Modal usage](https://github.com/eBay/nice-modal-react/tree/1.2.13#usage) |
| Package cost | Recorded minimal `createModal` consumer: **2,058 B / 1,044 B gzip**; React is the only peer and `type-utils` the only runtime dependency | Reproduced minimal named-`show` consumer: **758 B / 473 B gzip**; zero runtime dependencies, with React and React DOM as peers | Reproduce with [`package:check`](scripts/check-packed-package.mjs) and [`competitive:check`](scripts/check-competitive-package.mjs). The entry points differ, so these are package-cost observations, not a universal size ranking. |
| Performance | Optimized-build raw samples and summaries cover mount, unmount, open/render, settlement, delayed removal, stacking, and registry routing | No like-for-like run was made against the competitor | Reproducible local evidence: [`benchmark:lifecycle`](scripts/benchmark-lifecycle.mjs). No performance winner is claimed. |
| Maintenance status | 0.2.0 is the release line evaluated in this repository | 1.2.13 was published 2023-10-03; it remains the npm `latest` release on the evaluation date | Release evidence: [local manifest](package.json), [npm version](https://www.npmjs.com/package/@ebay/nice-modal-react/v/1.2.13), [GitHub release](https://github.com/eBay/nice-modal-react/releases/tag/1.2.13) |

The main trade-off is deliberate: this package does not provide unchecked `show("any-string")` routing. Imperative callers import a typed definition or use a typed registry, and a registry must be bound to a mounted provider. Nice Modal’s global component/id calls require less setup and can be more convenient when that trade-off is acceptable. Conversely, this package’s provider ownership, result inference, SSR behavior, and built-in confirmation are explicit tested contracts rather than conclusions drawn only from implementation structure.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test:run
pnpm run test:coverage
pnpm run build
pnpm run build-storybook
pnpm pack --pack-destination /tmp/react-modal-manager-pack
```

## License

MIT © [Oleksii Kyrychenko](https://github.com/okyrychenko-dev)
