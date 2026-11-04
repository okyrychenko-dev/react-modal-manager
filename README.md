# @okyrychenko-dev/react-modal-manager

[![npm version](https://img.shields.io/npm/v/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![npm downloads](https://img.shields.io/npm/dm/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Open a dialog, await a typed result, and continue your application flow. Input and result types follow the modal definition or registry key; each `ModalProvider` owns an independent lifecycle.

Use it for selection, editing and confirmation flows that return a result to their caller. The core manages opening, settlement and removal; your dialog components provide the shell, portal, styling and accessibility behavior.

## Installation

```sh
pnpm add @okyrychenko-dev/react-modal-manager
```

The only peer dependency is React 18 or 19. TypeScript consumers need TypeScript 5.1 or later and compatible React type definitions. The example below also imports a guard from `@okyrychenko-dev/type-utils`; declare that dependency directly when copying it:

```sh
pnpm add @okyrychenko-dev/type-utils
```

## Start with a complete dialog

Use the [plain React + Radix recipe](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/portable-react.md) to add confirmation to an existing React application. It includes the components, CSS and mounting instructions.

The [Next.js + Radix example](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/examples/nextjs-dialog/README.md) also demonstrates sequential dialogs, launcher cleanup and render-error recovery. Run it against the current checkout with `pnpm run preview:nextjs`. Its manifest pins modal-manager 0.2.0, which lacks APIs used by the current example; the preview installs a packed build of the checkout instead.

Both examples use the same composition:

- A renderer supplies the Radix root, portal and overlay.
- Confirmation content supplies one dialog surface, title, description, dismissal policy and initial focus.
- `ModalProvider` receives the renderer and confirmation definition and renders the dialogs automatically.

Radix, React DOM and Next.js are example dependencies. The core does not require them.

Inside the configured Provider, a caller can await the typed confirmation result:

```tsx
"use client";

import {
  ModalDismissError,
  useModalManager,
} from "@okyrychenko-dev/react-modal-manager";
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { useState } from "react";
import type { ReactNode } from "react";

export function ConfirmationButton(): ReactNode {
  const modal = useModalManager();
  const [outcome, setOutcome] = useState("Ready");

  async function handleClick(): Promise<void> {
    try {
      const result = await modal.confirm({
        title: "Delete report?",
        description: "This demo does not change your data.",
      });
      setOutcome(
        result.confirmed ? "Confirmed" : `Cancelled: ${result.reason}`,
      );
    } catch (error: unknown) {
      if (isInstanceOf(error, ModalDismissError)) {
        setOutcome(`Dismissed: ${error.reason}`);
      } else {
        setOutcome("Failed");
        console.error(error);
      }
    }
  }

  return (
    <>
      <button onClick={() => void handleClick()}>Open confirmation</button>
      <p role="status">{outcome}</p>
    </>
  );
}
```

`result.confirmed` narrows the result; the negative branch exposes `result.reason`. This [checked caller](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/examples/snippets/ConfirmationButton.tsx) only displays the outcome. Perform application actions in the confirmed branch, inside the same `try` block.

### Outcomes

| Action                                                                | Promise outcome                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Confirm in either implementation                                      | Resolves `{ confirmed: true }`                                                      |
| Cancel in the Radix example or built-in confirmation                  | Resolves `{ confirmed: false, reason: "cancel" }`                                   |
| Escape or outside interaction in the Radix example (when dismissible) | Rejects with `ModalDismissError`, reason `"dismiss"`                                |
| Escape or Dismiss button in built-in reference confirmation           | Resolves `{ confirmed: false, reason: "dismiss" }` when dismissible                 |
| `handle.dismiss()` or manager/registry `dismiss(id)`                  | Rejects with `ModalDismissError`, default reason `"dismiss"`                        |
| `closeAll()`                                                          | Rejects pending operations with reason `"close-all"`                                |
| Provider unmount                                                      | Rejects pending operations with reason `"provider-unmount"`                         |
| Custom content `close(result)` / `reject(error)`                      | Resolves the typed result / rejects; non-Error rejections become `ModalRejectError` |

Custom dialogs choose whether Cancel returns a result or dismisses the operation. The first `close`, `reject` or `dismiss` call settles the result; later calls are ignored. `closeDelayMs` can keep the settled instance rendered with status `"closing"`. Use `await handle.whenRemoved()` to wait for lifecycle removal, including removal during Provider disposal. It does not wait for a React DOM commit, focus restoration or animation completion. See [typed flows and cleanup](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/typed-flows.md).

### Reference confirmation

`ModalProvider` uses the bundled unstyled confirmation unless you supply `confirmModal`. It provides dialog semantics, initial focus, Tab containment and focus restoration, but no overlay, portal or background isolation. When using a Radix renderer, supply content that composes one Radix dialog surface, as the recipes do; wrapping the built-in confirmation would create nested dialogs.

## Custom flows and scope

Define a component with `ModalComponentProps<TInput, TResult>`, create its definition with `createModal()`, then call `modal.open(definition, input)`. The returned `ModalHandle<TResult>` is awaitable and exposes `instanceId`, `dismiss()` and `whenRemoved()`. See the [typed flow guide](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/typed-flows.md) and [checked adoption examples](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/examples/snippets/adoption-paths.typecheck.tsx).

Use a separate `createModalRegistry()` for each independent scope that opens dialogs outside React. A shared registry routes to its latest attached Provider; `dismiss(id)` and `closeAll()` target that Provider. Instance IDs are lifecycle-local and can repeat across Providers. Keep `handle.dismiss()` for deferred cancellation: it stays bound to the original operation when routing changes. See the [two-scope example](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/README.md#run-the-scope-example).

Registry `open`, `confirm`, `dismiss` and `closeAll` throw synchronously before attachment; `open` also throws for an unknown key. Check `isReady()` for attachment status. Ordinary descendant `useEffect` callbacks can open through their registry on mount; mount layout effects have no readiness guarantee. Hiding a Provider with React Activity ends pending operations with `provider-unmount`; revealing it permits new operations.

Unmounting a caller does not cancel its Provider-owned operation. Use `useOwnedModalHandles()` when the caller owns that lifetime: `owner.track(handle)` preserves the result or rejection and dismisses pending tracked handles on cleanup. Its returned promise has no handle members. Capture `const isActive = owner.captureLifetime()` before async work and check it before updating state or opening the next dialog. This hook is available in the current checkout.

`ModalProvider` renders a viewport automatically. Use its `renderer` prop for a shell or portal. Adding the public `ModalViewport` renders the same instances again, including component effects; it does not replace the automatic viewport. Content receives context from the Provider's rendering location, so pass caller-specific data as typed input or place the context above the Provider. React error boundaries handle render failures; a render failure does not automatically settle the handle.

Use the same resolved package copy and module format for connected Providers, registries and hooks. Different copies, including ESM and CommonJS builds, have separate React contexts and registry attachment symbols.

## Guides and verification

- [Registries, scope and context](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/registry-and-scope.md)
- [Dialog integration and framework recipes](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/dialog-integration.md)
- [Public API reference](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/api-reference.md)
- [Package evidence and development commands](https://github.com/okyrychenko-dev/react-modal-manager/blob/main/guides/package-and-development.md)

Run these commands from the repository root after installing dependencies:

| Command                                | Purpose                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run check`                       | Lint, formatting, typechecking, core tests and consumer snippet checks                                                    |
| `pnpm run preview:nextjs`              | Build and serve the Next.js example with the packed local library; Ctrl+C stops the server and removes the temporary copy |
| `pnpm run test:nextjs:unit`            | Typecheck and test the Next.js example in an isolated packed installation                                                 |
| `pnpm run test:nextjs`                 | Also lint, build production output and exercise the example in Chromium                                                   |
| `pnpm run build && pnpm run storybook` | Open the interactive stories                                                                                              |
| `pnpm run test:storybook`              | Run Storybook browser tests                                                                                               |

Browser tests require Playwright Chromium: `pnpm exec playwright install chromium`. The preview does not require it. Browser coverage is limited to the exercised scenarios; it does not establish full accessibility compliance.

## License

MIT © [Oleksii Kyrychenko](https://github.com/okyrychenko-dev)
