[Start here](../README.md) · [Guides](README.md)

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

Creates an isolated modal manager for a React subtree and automatically renders active modals through its viewport.

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
- `confirm(params): ModalHandle<ConfirmModalResult>`
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
- `confirm(params): ModalHandle<ConfirmModalResult>`
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
