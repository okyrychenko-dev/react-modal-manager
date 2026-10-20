[Start here](../README.md) · [Guides](README.md)

# Plain React confirmation with Radix

Add a complete typed confirmation to an existing client-rendered React 18 or 19 application. This recipe uses React DOM and Radix Dialog; it needs no Next.js runtime, router, Tailwind setup or backend. Your application must already have a TypeScript/TSX bundler that supports CSS imports, such as Vite.

## Install and copy

In your React application:

```sh
pnpm add @okyrychenko-dev/react-modal-manager @okyrychenko-dev/type-utils @radix-ui/react-dialog
```

React and React DOM must be installed at matching versions. For TypeScript, install `typescript`, `@types/react` and `@types/react-dom` as development dependencies if your application does not already have them. The checked recipe uses Radix Dialog 1.3.1. Radix is a recipe dependency; the core library does not require it. Declare type-utils directly because the recipe imports its guards and types.

Copy these files from [`examples/snippets`](../examples/snippets/) into the same directory in your application, retaining their names:

| File | Responsibility |
| --- | --- |
| [PortableReactExample.tsx](../examples/snippets/PortableReactExample.tsx) | Configures one Provider and renders the caller |
| [PortableDialogRenderer.tsx](../examples/snippets/PortableDialogRenderer.tsx) | Controlled Radix root, portal and overlay; routes dismissal to the owning instance |
| [PortableDialogSurface.tsx](../examples/snippets/PortableDialogSurface.tsx) | Shared Radix content and focus restoration |
| [PortableConfirmationContent.tsx](../examples/snippets/PortableConfirmationContent.tsx) | Title, description, dismissal policy, initial focus and explicit answers |
| [portable-confirmation.constants.ts](../examples/snippets/portable-confirmation.constants.ts) | Typed confirmation definition |
| [ConfirmationButton.tsx](../examples/snippets/ConfirmationButton.tsx) | Invokes confirmation and displays its outcome |
| [portable-react.css](../examples/snippets/portable-react.css) | Overlay, centered content, action spacing and focus outline |

Import the stylesheet once and render the example from your existing application:

```tsx
import { PortableReactExample } from "./PortableReactExample";
import "./portable-react.css";

// In your existing component tree:
<PortableReactExample />;
```

For a standalone entry point, copy [portable-react.main.tsx](../examples/snippets/portable-react.main.tsx) and load it through your bundler from an HTML document containing `<div id="root"></div>`. It mounts with `createRoot`; keep your existing root if the application already has one. The caller's `"use client"` directive is harmless in plain React and can be omitted.

The files are complete source, not pseudocode: all library imports use public package entry points. There are no imports from the Next.js example. This is the 0.3.0 candidate recipe; npm latest was verified as 0.2.0 on 2026-10-20. Install 0.3.0 explicitly after publication when using `whenRemoved()` or confirmation handle members. Before publication, verify the current workspace package as described below. To reproduce the repository verification against current source, run `pnpm install` and `pnpm run check:examples` in a checkout. The snippets have their own private workspace package in `examples/snippets/package.json`, which declares the recipe dependencies. The root install includes it automatically. `check:examples` builds the local public package, then delegates linting, typechecking and tests to that example package. Shared development tools remain in the repository root.

## Composition and ownership

`PortableReactExample` installs `PortableDialogRenderer` and the typed `portableConfirmation` definition on `ModalProvider`. The Provider **automatically renders its viewport**. Do not add `ModalViewport`: a second viewport duplicates the same instances. The renderer supplies the Radix root, portal and overlay; confirmation content supplies exactly one Radix content surface, title and description. Do not nest the bundled reference confirmation inside this renderer.

The example uses the default immediate lifecycle removal and no CSS animation. If you add an exit transition, coordinate the renderer's closed state, Radix Presence and `closeDelayMs`; a timer or `whenRemoved()` does not acknowledge transition or focus completion. See [dialog integration](dialog-integration.md) and [handle ownership and cleanup](typed-flows.md).

On close, the surface preserves focus in another open dialog or returns it to the connected, enabled opener. If that opener is gone, it focuses the `portable-workspace` heading. Keep that heading or adapt the fallback to a stable element in your application. Mount this example once; applications with multiple independent scopes should provide their own scope-specific focus targets.

## Policy and outcomes

The caller passes a title and description to `modal.confirm()`. You can also pass `confirmText`, `cancelText`, `variant` and `dismissible`:

- `dismissible` defaults to `true`: Escape and outside interaction reject with `ModalDismissError`, reason `"dismiss"`. Set it to `false` to prevent those two interactions from dismissing.
- Explicit Cancel still resolves `{ confirmed: false, reason: "cancel" }`; Confirm resolves `{ confirmed: true }`.
- `variant: "danger"` initially focuses Cancel; other variants initially focus Confirm. The variant controls initial focus here; add your own design-system colors if needed.
- Owner-bound `handle.dismiss()` remains available even for non-dismissible confirmations. Provider disposal and `closeAll()` also reject with their documented dismissal reasons.

`ConfirmationButton` awaits the inferred result: `result.confirmed` narrows the successful branch, and the negative branch exposes `result.reason`. It reports cancellation and expected dismissal separately. Unexpected failures are shown as `Failed` and reported with `console.error`; perform application actions inside that same `try` boundary and only after confirmation. The demo does not delete any data.

Unmounting the caller alone does not cancel a Provider-owned operation. If a launcher owns the operation lifetime, retain its handle and dismiss it during cleanup as shown in [typed flows](typed-flows.md). Use the [Next.js + Radix application](../examples/nextjs-dialog/README.md) for the larger sequential customer flow and render-error recovery example.

## Verification boundaries

`pnpm run check:examples` exercises this portable composition with the public package: one rendered dialog, typed Confirm/Cancel outcomes, Escape dismissal, initial focus, focus restoration (including an unavailable opener and stacked dialogs), outside-interaction policy, owner dismissal and a required dangerous decision. The existing packed production Chromium harness (`pnpm run test:nextjs`) verifies the original Radix composition's outside-interaction policy and larger flows. The portable snippet tests run in a DOM emulator and do not establish browser-wide accessibility certification.
