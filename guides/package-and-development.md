[Start here](../README.md) · [Guides](README.md)

## Package Boundary

This package intentionally does not know about guarded actions, permissions, pending state, or action execution. It is the base modal/dialog lifecycle layer.

Compose action-aware flows in application code on top of this API. A separate integration package is a future option when it removes demonstrated repetition; it is not required to use modal confirmation with guarded actions.

The figures below are historical observations, not measurements of the current working tree. Reproduce them before using them for a current package decision.

### Compared to [`@ebay/nice-modal-react`](https://github.com/eBay/nice-modal-react)

Historical comparison, revalidated **2026-09-13** for this package's **0.2.0** release line (through `3a98aa8`) and the current stable [`@ebay/nice-modal-react` 1.2.13](https://www.npmjs.com/package/@ebay/nice-modal-react/v/1.2.13). “Verified behavior” below means an executable public-surface check; “architecture” describes source structure and is not itself a consumer guarantee.

| Area                      | `react-modal-manager`                                                                                                                                     | `nice-modal-react`                                                                                                                         | Evidence kind                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input and result typing   | A definition or registry key couples input to `Promise<TResult>`                                                                                          | Component props are inferred; `show()` result is caller-selected and handlers expose `Promise<unknown>`                                    | Verified declarations: [local packed-consumer fixture](../tests/consumers/package/package-consumer.typecheck.ts), [Nice Modal 1.2.13 declarations](https://unpkg.com/@ebay/nice-modal-react@1.2.13/lib/esm/index.d.ts)                                                           |
| Lifecycle correctness     | Per-instance handles; resolve, reject, and dismiss settle once; optional closing phase precedes removal                                                   | Promise-based `show`; separate `hide` and `remove`; UI-library helpers connect removal to exit callbacks                                   | Verified local behavior: [lifecycle tests](../src/lifecycle/__tests__/modalLifecycle.test.ts); documented competitor behavior: [Nice Modal usage and helpers](https://github.com/eBay/nice-modal-react/tree/1.2.13#usage)                                                        |
| Provider isolation        | Nested, adjacent, and independent roots own isolated lifecycle state                                                                                      | Each provider creates reducer state, while imperative dispatch, registrations, and promise callbacks are module-level                      | Verified local behavior: [root tests](../src/provider/__tests__/ModalProvider.roots.test.tsx); competitor architecture: [1.2.13 source](https://github.com/eBay/nice-modal-react/blob/1.2.13/src/index.tsx)                                                                      |
| React compatibility       | Declares React 18 and 19 and runs the same root/Strict Mode suite against both                                                                            | Declares React and React DOM `>16.8.0`; the published package was developed with React 17                                                  | Verified local matrix: [CI](../.github/workflows/ci.yml); published competitor metadata: [package manifest](https://unpkg.com/@ebay/nice-modal-react@1.2.13/package.json)                                                                                                        |
| SSR and RSC               | Provider server rendering, separate-request isolation, and hydration are tested; RSC usage has a compiled Client Component example                        | No SSR, hydration, or React Server Components contract is documented in the 1.2.13 README                                                  | Verified local behavior: [SSR tests](../src/provider/__tests__/ModalProvider.ssr.test.tsx) and [RSC-style fixture](../examples/snippets/next-app-router-provider.typecheck.tsx); competitor documentation: [1.2.13 README](https://github.com/eBay/nice-modal-react/tree/1.2.13) |
| Imperative access         | A typed registry opens outside React after being bound to a provider; keys, input, and results are inferred                                               | `NiceModal.show(component, props)` or a registered string id can be called directly after a provider establishes the module-level dispatch | Verified local behavior: [registry tests](../src/registry/__tests__/createModalRegistry.test.tsx); documented competitor behavior: [component and id APIs](https://github.com/eBay/nice-modal-react/tree/1.2.13#using-your-modal-component)                                      |
| Rendering independence    | Lifecycle renders modal definitions through a replaceable wrapper; no portal, overlay, CSS, or design-system dependency                                   | Supplies no dialog markup and wraps consumer components; includes helpers for Ant Design, MUI, and React Bootstrap lifecycles              | Public interfaces: [local renderer types](../src/types/modal.ts), [Nice Modal helpers](https://unpkg.com/@ebay/nice-modal-react@1.2.13/lib/esm/index.d.ts)                                                                                                                       |
| Accessibility composition | Built-in confirmation provides dialog semantics, initial focus, focus trapping, and safe destructive focus; custom modals/renderers remain consumer-owned | Accessibility belongs entirely to the consumer’s chosen modal component or UI library                                                      | Verified local behavior: [confirmation tests](../src/confirm/__tests__/ConfirmModal.test.tsx); documented competitor scope: [“not a React modal component”](https://github.com/eBay/nice-modal-react/tree/1.2.13#nice-modal)                                                     |
| First-use ergonomics      | `confirm()` is the shortest path; custom flows define a modal and open it directly or through a registry                                                  | `show(component, props)` is the shortest path; string access adds `register(id, component)`                                                | Documented public APIs: [the introduction](../README.md#start-with-a-complete-dialog), [Nice Modal usage](https://github.com/eBay/nice-modal-react/tree/1.2.13#usage)                                                                                                            |
| Package cost              | Recorded minimal `createModal` consumer: **2,058 B / 1,044 B gzip**; React is the only peer and `type-utils` the only runtime dependency                  | Reproduced minimal named-`show` consumer: **758 B / 473 B gzip**; zero runtime dependencies, with React and React DOM as peers             | Reproduce with [`package:check`](../scripts/check-packed-package.mjs) and [`competitive:check`](../scripts/check-competitive-package.mjs). The entry points differ, so these are package-cost observations, not a universal size ranking.                                        |
| Performance               | Optimized-build raw samples and summaries cover mount, unmount, open/render, settlement, delayed removal, stacking, and registry routing                  | No like-for-like run was made against the competitor                                                                                       | Reproducible local evidence: [`benchmark:lifecycle`](../scripts/benchmark-lifecycle.mjs). No performance winner is claimed.                                                                                                                                                      |
| Maintenance status        | 0.2.0 is the release line evaluated in this repository                                                                                                    | 1.2.13 was published 2023-10-03; it remains the npm `latest` release on the evaluation date                                                | Release evidence: [local manifest](../package.json), [npm version](https://www.npmjs.com/package/@ebay/nice-modal-react/v/1.2.13), [GitHub release](https://github.com/eBay/nice-modal-react/releases/tag/1.2.13)                                                                |

The main trade-off is deliberate: this package does not provide unchecked `show("any-string")` routing. Imperative callers import a typed definition or use a typed registry, and a registry must be bound to a mounted provider. Nice Modal’s global component/id calls require less setup and can be more convenient when that trade-off is acceptable. Conversely, this package’s provider ownership, result inference, SSR behavior, and built-in confirmation are explicit tested contracts rather than conclusions drawn only from implementation structure.

## Development

Library implementation and tests live in `src/`. Documentation snippets live in
`examples/snippets/`, with their own TypeScript and Vitest configurations. They
import the public package entry point and resolve its built `dist` exports without
source aliases. `pnpm run check:examples` builds the library, type-checks the snippets
and runs their behavior tests. The standalone `typecheck:examples` and
`test:examples` commands also build first so they work from a clean checkout.

Runnable example applications belong in `examples/<name>/`, each with its own
private `package.json`, dependencies and application configuration. A local package
dependency should resolve the library's public built exports. The runnable
[`nextjs-dialog` example](../examples/nextjs-dialog/README.md) installs a local tarball
and checks production App Router rendering and hydration with Radix Dialog.
The App Router snippet remains a compile-only client boundary example.

Packed-package consumer fixtures live in `tests/consumers/`. The existing
`package:check` command packs the library and checks its ESM/CommonJS exports and
declarations in a temporary consumer using
`tests/consumers/package/package-consumer.typecheck.ts`. This checks the distributable
artifact separately from source tests and documentation snippets.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run check:examples
pnpm run lint
pnpm run format:check
pnpm run test:run
pnpm run test:coverage
pnpm run build
pnpm run build-storybook
pnpm pack --pack-destination /tmp/react-modal-manager-pack
```

### Runnable Next.js and Radix example

See [`examples/nextjs-dialog`](../examples/nextjs-dialog/README.md) for a complete
App Router application with a custom Radix Dialog renderer, content-only confirmation,
provider-bound handle dismissal and launcher cleanup. Run `pnpm run test:nextjs` to
verify the packed library through a production build and Chromium interactions.
