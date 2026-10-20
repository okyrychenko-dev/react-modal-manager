[Start here](../README.md) · [Guides](README.md)

## Confirmation Modals

The built-in confirmation is unstyled reference UI, without a portal, overlay or background isolation. For a complete application shell, start with the [runnable Next.js and Radix example](../examples/nextjs-dialog/README.md), which composes one `DialogSurface` per content component under a shared Radix root/portal renderer. The confirmation passes dismissal and initial-focus policy directly to that surface. The recipes below are composition guidance; shadcn, Tailwind and form-library variations are not separately validated application fixtures.

`modal.confirm()` (and `registry.confirm()`) opens the built-in confirmation modal and normally resolves to a typed, discriminated-union result. The Confirm button returns `{ confirmed: true }`; Cancel returns `{ confirmed: false, reason: "cancel" }`; Escape and the built-in Dismiss button return `{ confirmed: false, reason: "dismiss" }` when dismissal is allowed. These UI actions call `close(result)`, not the lifecycle `dismiss()`. Programmatic dismissal, `closeAll()`, and provider unmount still reject with `ModalDismissError`.

```tsx
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
try {
  const handle = modal.confirm({
    title: "Discard changes?",
    description: "Your edits will be lost.",
    variant: "warning",
  });
  // Keep handle.dismiss for later owner-specific cancellation if needed.
  const result = await handle;

  if (result.confirmed) {
    discard();
  }
  // Otherwise result.reason is "cancel" | "dismiss".
} catch (error) {
  if (!isInstanceOf(error, ModalDismissError)) {
    console.error(error);
  }
}
```

The built-in confirmation does not guarantee background inertness or pointer isolation. Dialog semantics and Tab handling do not establish full modal isolation or complete accessibility compliance. Use a suitable dialog implementation when your application needs those guarantees.

The bundled `confirmModal` is an **unstyled reference implementation with basic accessibility behavior**:

- `role="dialog"` with `aria-modal="true"`, `aria-labelledby` (title) and `aria-describedby` (description)
- the confirm button receives focus on open (the cancel button for `variant: "danger"`, so a stray Enter never confirms a destructive action), and removing a lower confirmation preserves focus in the upper one; removing the active confirmation returns focus to a connected, enabled opener or a remaining confirmation
- `Tab` / `Shift+Tab` are trapped within the dialog
- `Escape` dismisses it (unless `dismissible: false`)

It ships no styling and no portal — those belong to your `renderer` or design system. It is ideal for tests and simple flows; production apps usually supply their own confirm modal — see [Custom Confirm Modal](#custom-confirm-modal).

## Custom Renderer

Use `renderer` when your application needs portals, overlays, animation wrappers, or design-system primitives.

```tsx
import type { ModalRendererProps } from "@okyrychenko-dev/react-modal-manager";

function AppModalRenderer(props: ModalRendererProps) {
  const { children, modal } = props;

  return (
    <div
      data-modal-id={modal.instanceId}
      data-status={modal.status}
      role="presentation"
    >
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
import type { PropsWithChildren, ReactNode } from "react";

export function AppModalProvider(props: PropsWithChildren): ReactNode {
  const { children } = props;

  return <ModalProvider>{children}</ModalProvider>;
}
```

```tsx
// app/layout.tsx (Server Component)
import { AppModalProvider } from "./providers/modal-provider";
import type { PropsWithChildren, ReactNode } from "react";

export default function RootLayout(props: PropsWithChildren): ReactNode {
  const { children } = props;

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

function TailwindRenderer(props: ModalRendererProps) {
  const { children, modal } = props;

  return (
    <div
      data-status={modal.status}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50
                 transition-opacity data-[status=closing]:opacity-0"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {children}
      </div>
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

function ShadcnRenderer(props: ModalRendererProps) {
  const { children, modal } = props;

  const modalManager = useModalManager();

  function handleOpenChange(open: boolean) {
    if (!open && modal.status === "open") {
      modalManager.dismiss(modal.instanceId);
    }
  }

  return (
    <Dialog open={modal.status === "open"} onOpenChange={handleOpenChange}>
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

function RenameForm(
  props: ModalComponentProps<{ currentName: string }, RenameValues>,
) {
  const { input, close } = props;

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
import {
  createModal,
  type ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";
import type {
  ConfirmModalParams,
  ConfirmModalResult,
} from "@okyrychenko-dev/react-modal-manager";

function MyConfirm(
  props: ModalComponentProps<ConfirmModalParams, ConfirmModalResult>,
) {
  const { input, close } = props;
  // render with your design system, then:
  // close({ confirmed: true })
  // close({ confirmed: false, reason: "cancel" })
  return null;
}

const confirmModal = createModal({ id: "confirm", component: MyConfirm });

<ModalProvider confirmModal={confirmModal}>{children}</ModalProvider>;
```

## Complete flows and render recovery

The [runnable Next.js example](../examples/nextjs-dialog/README.md#sequential-customer-workflow)
includes typed customer selection, editing and confirmation, cancellation, launcher
cleanup and a bounded delayed-exit visual. Its
[local error-boundary recipe](../examples/nextjs-dialog/README.md#local-render-error-recovery)
shows fallback UI and explicitly dismisses the failed operation while preserving
an unrelated pending dialog. A boundary that only hides failed content does not
settle its modal handle. Unmounting the Provider dismisses all its pending operations
with `provider-unmount`; local recovery must arrange its own settlement.
