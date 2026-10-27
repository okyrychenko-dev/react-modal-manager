[Start here](../README.md) · [Guides](README.md)

## Type Safety

This is where the library earns its place. Define a modal once and every call site is checked end to end.

```tsx
import {
  createModal,
  type ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";

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

function RenameModal(props: ModalComponentProps<RenameInput, RenameResult>) {
  const { close, input } = props;

  // `input` is RenameInput. `close` only accepts a RenameResult.
  // Replace this placeholder with your modal content.
  return null;
}

const renameModal = createModal({ component: RenameModal });

// At the call site, TypeScript infers everything:
const result = await modal.open(renameModal, {
  reportId: "1",
  currentName: "Q3",
});
//    ^? RenameResult — discriminated union, narrowed by `result.status`
//                       and `modal.open` rejects the wrong input shape at compile time.
```

- `ModalComponentProps<TInput, TResult>` ties the component's `input` and `close` together.
- `modal.open(def, input)` rejects a mismatched `input` and returns an awaitable `ModalHandle<TResult>` (see the [handle reference](api-reference.md#modalhandletresult)).
- The registry infers input/result **from the key** (see below).
- `confirm()` returns a discriminated union, so `if (result.confirmed)` narrows the type.

## Typed Modal Flow

Define a modal with explicit input and result types.

The inline markup below illustrates the typed contract. For a complete dialog shell, use the [runnable Radix application](../examples/nextjs-dialog/README.md); an open HTML dialog alone does not provide its modal focus and background-isolation policy.

```tsx
import {
  createModal,
  type ModalComponentProps,
} from "@okyrychenko-dev/react-modal-manager";
import { useState, type ChangeEvent } from "react";

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

function RenameReportModal(
  props: ModalComponentProps<RenameReportInput, RenameReportResult>,
) {
  const { close, input } = props;

  const [name, setName] = useState(input.currentName);

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.target.value);
  }

  function handleCancel(): void {
    close({ status: "cancelled" });
  }

  function handleRename(): void {
    close({ status: "renamed", name });
  }

  return (
    <dialog open>
      <h2>Rename report</h2>
      <input value={name} onChange={handleNameChange} />
      <button onClick={handleCancel}>Cancel</button>
      <button onClick={handleRename}>Rename</button>
    </dialog>
  );
}

export const renameReportModal = createModal<
  RenameReportInput,
  RenameReportResult
>({
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
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import { ModalDismissError } from "@okyrychenko-dev/react-modal-manager";

async function renameReportWithModal(
  modal: ReturnType<typeof useModalManager>,
) {
  try {
    const result = await modal.open(renameReportModal, {
      reportId: "report-1",
      currentName: "Draft",
    });

    if (result.status === "renamed") {
      await renameReport({ reportId: "report-1", name: result.name });
    }
  } catch (error) {
    if (isInstanceOf(error, ModalDismissError)) {
      return;
    }
    throw error;
  }
}
```

Keep the handle returned by `open()` when the caller needs to identify or dismiss the specific modal instance later:

```tsx
import { isInstanceOf } from "@okyrychenko-dev/type-utils";

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
  if (!isInstanceOf(error, ModalDismissError)) {
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

Keep the original handle to wait for removal before continuing a sequence:

```tsx
const handle = modal.confirm({ title: "Continue?" });
try {
  const result = await handle;
  await handle.whenRemoved();
  if (result.confirmed) {
    // Continue the flow after this instance leaves the lifecycle.
  }
} catch (error) {
  // Removal also completes after dismissal or rejection.
  await handle.whenRemoved();
  if (!isInstanceOf(error, ModalDismissError)) {
    throw error;
  }
}
```

`whenRemoved()` returns a `Promise<void>` that resolves when this instance leaves its owning lifecycle. You can call it while open, while closing, or after removal, and repeated calls share the same promise. It never rejects: dismissal and failure still belong to the result handle and must be handled separately. With no close delay, removal is immediate on settlement. Provider disposal removes both open and closing instances, completes their removal promises, and cancels pending timers. A handle opened on an already disposed lifecycle also has completed removal.

This signal tracks lifecycle removal, not a React DOM commit, focus restoration, or a renderer-reported transition end. Configure `closeDelayMs` for your renderer's exit duration. Disposal completing removal does not mean the provider is still available for another modal. Handles from `open()`, registered definitions, registries and `confirm()` all support this method and retain their original provider owner. Ordinary promises returned by `.then()`, `.catch()` or `.finally()` do not carry the handle methods.

| Action                                   | Promise outcome                                                     | When to use it                                        |
| ---------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `close(result)`                          | Resolves with typed `result`                                        | A completed flow or an expected result such as Cancel |
| `reject(error)`                          | Rejects with `error` (non-`Error` values become `ModalRejectError`) | An operation failed                                   |
| `dismiss(reason?)`                       | Rejects with `ModalDismissError`                                    | A custom modal is abandoned without a result          |
| `modal.dismiss(id)` / `handle.dismiss()` | Rejects with `ModalDismissError("dismiss")` by default              | Close one pending modal externally                    |
| `modal.closeAll()`                       | Rejects every open modal with reason `"close-all"`                  | Tear down a modal stack                               |
| Provider unmount                         | Rejects every pending modal with reason `"provider-unmount"`        | Automatic cleanup of the provider's lifecycle         |

Helpers returning a promise propagate failures to their callers. At a detached event or command boundary, attach a terminal rejection handler to each derived chain: catching the original handle does not catch errors thrown by a separate `handle.then(...)` or `handle.finally(...)` chain. Keep result-processing work inside that error-handling boundary, and use a non-throwing error reporter for unexpected failures.

A **calling component** unmounting does not automatically cancel a modal owned by a provider higher in the tree. If the caller owns the operation lifetime, use `useOwnedModalHandles()` from the public package. This hook is unreleased; use the current workspace or its packed build until a compatible npm release is available.

```tsx
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
import {
  ModalDismissError,
  useModalManager,
  useOwnedModalHandles,
} from "@okyrychenko-dev/react-modal-manager";

function RenameLauncher() {
  const modal = useModalManager();
  const owner = useOwnedModalHandles();

  async function handleClick() {
    const isActive = owner.captureLifetime();
    try {
      const result = await owner.track(
        modal.open(renameReportModal, {
          reportId: "report-1",
          currentName: "Draft",
        }),
      );
      if (!isActive()) return;
      if (result.status === "renamed") {
        await renameReport({ reportId: "report-1", name: result.name });
      }
    } catch (error) {
      if (!isInstanceOf(error, ModalDismissError)) {
        console.error(error);
      }
    }
  }

  return <button onClick={() => void handleClick()}>Rename</button>;
}
```

`track` retains each handle until its result settles; launcher cleanup dismisses all pending tracked handles, including concurrent launches. Its returned promise preserves the result and rejection but does not retain handle members. Keep the original handle when individual dismissal or removal waiting is needed. `owner.dismissAll()` cancels current owned operations while permitting later work.

The captured lifetime guard stays invalid after cleanup even if effects reconnect with preserved state. Capture it before starting work and check it before local state updates or subsequent modal steps. Tracking outside an active passive-effect lifetime immediately dismisses the supplied handle. Call the hook's methods from event handlers or passive effects registered after the hook, not render or mount layout effects.

This ownership is optional: operations that must survive the initiating launcher should remain untracked or be tracked by a longer-lived owner. Parent notification after cleanup can be intentional, so the hook does not suppress result handlers itself. It does not cancel application requests started after a modal result or await focus, DOM removal or animation completion.

Provider lifetime remains separate: React 18/19 Strict Mode replay preserves the Provider's lifecycle through deferred disposal, while launcher ownership cleanup immediately dismisses its pending handles. A passive effect opening an owned modal during replay should capture a fresh lifetime guard per setup and handle the first setup's dismissal.
