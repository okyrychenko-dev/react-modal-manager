# Consumer guides

Start with the [plain React + Radix recipe](portable-react.md) for a complete dialog shell and typed confirmation in an existing application, or run the [Next.js and Radix application](../examples/nextjs-dialog/README.md) for larger flows. The [package introduction](../README.md) covers installation and outcomes.

- [Typed flows and cleanup](typed-flows.md): definition input/results, handles, rejection and caller ownership.
- [Registries and Provider scope](registry-and-scope.md): commands outside React, isolated registries, rendering context and owner-specific cancellation.
- [Dialog integration](dialog-integration.md): reference confirmation limitations, renderer composition, Next.js and design-system recipes.
- [API reference](api-reference.md): exported contracts and options. ModalViewport remains exported for compatibility; adding one does not disable the automatic viewport.
- [Package evidence and development](package-and-development.md): historical comparison, consumer fixtures and verification commands.

## Run the scope example

From a repository checkout, run `pnpm install --frozen-lockfile`, `pnpm run build`, then `pnpm run storybook`. Open **Examples/Scope isolation → Separate Registries**.

1. Open A, mount B, then open B. Both first instances display `modal-0` because instance IDs belong to their Provider lifecycle.
2. Dismiss retained A handles. Only A closes; B stays pending and can complete independently.
3. Open A twice and unmount its launcher. Both A operations are dismissed while its Provider and B remain mounted. Remount the launcher to start again.

This example demonstrates ownership with inline content, not a complete dialog or focus policy. Use the Radix application for dialog presentation. The same scope component is exercised through the built public package by snippet tests and the existing Storybook browser runner.
