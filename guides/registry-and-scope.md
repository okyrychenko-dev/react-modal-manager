[Start here](../README.md) · [Guides](README.md)

## Typed Modal Registry

Prefer one registry per independent Provider scope and keep returned handles for deferred cancellation. [Run the scope-isolation example](README.md#run-the-scope-example) to see A cancellation leave B untouched even when their instance IDs match. A registry shared across Providers is an advanced routing choice, described below.

Use `createModalRegistry()` when code needs to open modals by a stable key while keeping typed input and result contracts. This suits command palettes, event buses, action maps, and configuration-driven flows. Pass the registry straight to `ModalProvider` — there is no controller to wire up.

```tsx
// modals.ts
import {
  createModal,
  createModalRegistry,
} from "@okyrychenko-dev/react-modal-manager";
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

Before a provider binds the registry, `modals.isReady()` is `false` and registry operations throw. Binding happens in a client layout effect, so a registry is intentionally unbound during server rendering and render itself. Ordinary descendant `useEffect` callbacks can open operations on mount, including Strict Mode effect replay. Descendant `useLayoutEffect` callbacks have no readiness guarantee: they can run before the Provider binding or lifecycle reconnection. Open in `useEffect` or an event handler instead; no calls are queued.

A shared registry routes by attachment order, not by the caller's React context. On a simultaneous nested mount, the outer Provider's binding attaches after the inner one and wins. An inner Provider mounted or reconnected later becomes the newest binding. Unbinding restores the previous live binding; configuration updates preserve precedence. Prefer independent registries when callers must target their own scope, or `useModalManager()` for the nearest Provider.

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
      <ModalProvider
        registry={workspaceModals}
        renderer={WorkspaceModalRenderer}
      >
        <Workspace />
      </ModalProvider>
    </>
  );
}
```

### Activity visibility and operation lifetime

On React versions supporting `Activity`, hiding a boundary containing a `ModalProvider` disconnects its effects and registry binding. Pending operations reject with `ModalDismissError("provider-unmount")`; settled operations keep their result, and all `whenRemoved()` waiters resolve as retained content and removal timers are cleared. Cleanup is deferred by one microtask so immediate Strict Mode effect replay preserves operations. Hiding and revealing in separate commits with cleanup allowed to finish ends the old operation lifetime.

Revealing reconnects the Provider with an empty lifecycle and working subscriptions. New `open()` and `confirm()` operations work; old handles remain settled and cannot dismiss new operations. Actual unmount has the same cleanup policy and leaves the registry unbound (or routing to another live Provider). This does not promise DOM, animation or focus completion. Activity coverage applies only where React provides Activity; React 18 continues to support ordinary mount, Strict Mode and unmount.

### Rendering placement and React context

`ModalProvider` automatically renders one `ModalViewport` after its children. Do not add another viewport inside the provider: it renders the same instances again. The exported `ModalViewport` remains available, but adding one does not switch the provider into a manual mode. Use `renderer` for a shell or portal.

Modal content receives React contexts at that viewport's rendering location. A context provider nested around the launch button is a sibling of the automatic viewport and does not automatically reach the modal. A portal preserves the renderer's React context; its DOM destination does not capture the launcher's context.

Choose the placement that matches ownership:

```tsx
import { isInstanceOf } from "@okyrychenko-dev/type-utils";
// Shared context: both the launcher and modal content see the workspace.
<WorkspaceContext.Provider value={workspace}>
  <ModalProvider>
    <ReportsPage />
  </ModalProvider>
</WorkspaceContext.Provider>;

// Local scope: put the modal provider inside the context it needs.
<WorkspaceContext.Provider value={workspace}>
  <ModalProvider registry={workspaceModals}>
    <Workspace />
  </ModalProvider>
</WorkspaceContext.Provider>;

// Launcher-only data: pass it through the modal's typed input.
const handle = modal.open(renameReportModal, {
  reportId: report.id,
  currentName: report.name,
});
void handle.catch((error: unknown) => {
  if (!isInstanceOf(error, ModalDismissError)) console.error(error);
});
```

The context/input behavior and single automatic rendering path are exercised in [`examples/snippets/__tests__/adoption-paths.test.tsx`](../examples/snippets/__tests__/adoption-paths.test.tsx), using the compile-checked [`context modal`](../examples/snippets/rendering-context.typecheck.tsx).

Instance IDs are **lifecycle-local**, not globally unique. Different providers can both have an instance named `modal-0`. `registry.dismiss(id)` targets the provider currently selected by that registry, even if the ID originally came from another provider. Keep the returned `open()` or `confirm()` handle and call `handle.dismiss()` for deferred owner-specific cancellation. A globally unique ID would not change registry routing.
