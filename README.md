# @okyrychenko-dev/react-modal-manager

[![npm version](https://img.shields.io/npm/v/@okyrychenko-dev/react-modal-manager.svg)](https://www.npmjs.com/package/@okyrychenko-dev/react-modal-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Open a dialog, await a typed result, and continue your application flow. Input and result types follow the modal definition or registry key; each `ModalProvider` owns an independent lifecycle.

Use this for repeated selection, editing and confirmation flows. A few local windows may only need component state. The core manages lifecycle; your dialog primitives supply the shell, portal, styling and accessibility policy.

## Installation

```sh
pnpm add @okyrychenko-dev/react-modal-manager
```

React 18 or 19 is the only peer dependency. Examples below use guards from `@okyrychenko-dev/type-utils`; add it as a direct dependency when copying those imports:

```sh
pnpm add @okyrychenko-dev/type-utils
```

## Start with a complete dialog

Use the [complete plain React + Radix recipe](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/portable-react.md) in an existing React application. It includes installation, styling, confirmation content, renderer, Provider and caller, with no Next.js runtime required.

For a larger runnable application, use the [Next.js + Radix example](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/nextjs-dialog/README.md). Its setup guide installs the packed library and starts a complete example with a portal, overlay, focus containment, focus restoration, a custom confirmation surface and handled outcomes. It also covers handle dismissal, launcher cleanup and reopening. Radix and Next.js are example dependencies, not core dependencies.

The application combines these pieces:

- [`DialogRenderer`](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/nextjs-dialog/app/DialogRenderer.tsx) owns the Radix root, portal and overlay; `DialogSurface` supplies the shared content surface and focus restoration.
- [`ConfirmationContent`](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/nextjs-dialog/app/ConfirmationContent.tsx) composes `DialogSurface` with title, description, confirmation policy and typed Confirm/Cancel results.
- [`DialogExample`](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/nextjs-dialog/app/DialogExample.tsx) installs both on one `ModalProvider`.

Inside that configured Provider, a caller can await the inferred confirmation result:

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

`result.confirmed` narrows the result; the negative branch exposes `result.reason`. This [checked caller](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/snippets/ConfirmationButton.tsx) reports an outcome without modifying data. For application work, perform the action only in the confirmed branch and keep it inside the same error-handling boundary. A caller's own unmount does not cancel a Provider-owned operation; use the runnable launcher's cleanup pattern when the caller owns that lifetime.

### Outcomes

| Action                                                      | Promise outcome                                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Confirm                                                     | Resolves `{ confirmed: true }`                                                      |
| Cancel in the Radix example or built-in confirmation        | Resolves `{ confirmed: false, reason: "cancel" }`                                   |
| Escape or outside interaction in the Radix example (when dismissible) | Rejects with `ModalDismissError`, reason `"dismiss"`                                |
| Escape or Dismiss button in built-in reference confirmation | Resolves `{ confirmed: false, reason: "dismiss" }` when dismissible                 |
| `handle.dismiss()` or manager/registry `dismiss(id)`        | Rejects with `ModalDismissError`, default reason `"dismiss"`                        |
| `closeAll()`                                                | Rejects pending operations with reason `"close-all"`                                |
| Provider unmount                                            | Rejects pending operations with reason `"provider-unmount"`                         |
| Custom content `close(result)` / `reject(error)`            | Resolves the typed result / rejects; non-Error rejections become `ModalRejectError` |

For custom dialogs, the component chooses whether Cancel returns a result or dismisses. The result settles once, immediately; `closeDelayMs` can keep a closing instance rendered afterward. Use `await handle.whenRemoved()` to wait for lifecycle removal after that delay or provider disposal. This does not await a React DOM commit or a renderer's animation callback. See [typed flows and cleanup](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/typed-flows.md).

### Reference confirmation

A bare `<ModalProvider>` uses the bundled **unstyled reference confirmation**. It has basic dialog/focus behavior but provides no overlay, portal, background inertness or pointer isolation. It is useful for inspecting the contract; use the complete Radix path above for application integration. Do not put the built-in confirmation inside a renderer that already supplies dialog semantics; compose exactly one dialog content surface with the Radix renderer, as in the example.

## Custom flows and scope

Define a component with `ModalComponentProps<TInput, TResult>`, create its definition with `createModal()`, then call `modal.open(definition, input)`. The returned `ModalHandle<TResult>` is awaitable and exposes `instanceId`, `dismiss()` and `whenRemoved()`. See the [typed flow guide](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/typed-flows.md) and [checked adoption examples](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/examples/snippets/adoption-paths.typecheck.tsx).

Keep the returned handle for deferred cancellation. Use a separate `createModalRegistry()` per independent scope when opening from commands outside React. A shared registry routes to its latest mounted Provider; an instance ID belongs only to its lifecycle. `handle.dismiss()` retains the original owner even after another Provider mounts. [Run the two-scope example](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/README.md#run-the-scope-example).

`ModalProvider` renders its viewport automatically. Use `renderer` for a shell or portal; adding another viewport renders the same instances twice. Modal content receives context from the Provider's rendering location, so pass launcher-only data as typed input or place the relevant context above the Provider.

## Guides and verification

- [Registries, scope and context](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/registry-and-scope.md)
- [Dialog integration and framework recipes](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/dialog-integration.md)
- [Public API reference](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/api-reference.md)
- [Package evidence and development commands](https://github.com/okyrychenko-dev/react-modal-manager/blob/v0.3.0/guides/package-and-development.md)

From a repository checkout, `pnpm run check:examples` builds the public package and checks the consumer snippets. `pnpm run test:nextjs` verifies the packed Radix application through a production build and Chromium. `pnpm run build` followed by `pnpm run storybook` opens the interactive examples; `pnpm run test:storybook` runs their browser checks. Browser commands require Playwright Chromium (`pnpm exec playwright install chromium`). These checks do not establish full accessibility certification or support for every framework/browser combination.

## License

MIT © [Oleksii Kyrychenko](https://github.com/okyrychenko-dev)
