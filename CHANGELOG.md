# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Export `useOwnedModalHandles()` and `OwnedModalHandles` for opt-in launcher ownership: track typed results, dismiss pending handles on cleanup and capture lifetime guards that remain invalid after effect reconnection. Tracking outside an active effect lifetime immediately dismisses the supplied handle.

### Changed

- Import handle ownership from the public package in consumer examples instead of copying recipe source. Preview the Next.js example against a temporary packed build with `pnpm run preview:nextjs`; the pinned npm baseline does not yet provide the new hook.

### Fixed

- Restore Provider operation and subscriptions after React Activity hide/reveal. Hiding settles pending operations with `provider-unmount`, clears retained content and resolves removal waiting; reveal accepts new operations without reviving old handles.
- Bind registries before descendant passive mount effects, including Strict Mode replay, while preserving shared-registry precedence and configuration updates. Layout-effect opening remains unsupported.

## [0.3.0] - 2026-10-20

### Added

- Add opt-in `ModalHandle.whenRemoved()` to await lifecycle removal after the close delay or provider disposal, independently of result settlement. Repeated calls share a promise; this does not acknowledge DOM commits, focus restoration or animation completion.
- Add a complete portable React/Radix confirmation recipe, checked consumer snippets, scope-owned cancellation and a runnable Next.js/Radix customer flow with local render-error recovery.
- Add production Chromium verification of packed Next.js consumers and browser interaction coverage for Storybook; include the Next.js smoke in the release gate.

### Changed

- Return a provider-bound `ModalHandle<ConfirmModalResult>` from manager and registry `confirm()`, including `instanceId`, `dismiss()` and `whenRemoved()`. Awaiting, chaining and typed confirmation outcomes remain supported. Code depending on a plain Promise return contract should review this change; derived promises do not retain handle members.
- Generate modal definition IDs without requiring `crypto.randomUUID()`. Generated IDs are module-local implementation identities, not globally unique or persistent keys; explicit IDs remain supported.
- Replace the long introduction with focused adoption guides and document automatic viewport rendering, rendering context, lifecycle-local instance IDs and handle ownership.
- Pin package README guide links to the release tag so documentation follows the installed artifact.

### Fixed

- Preserve registry routing precedence when Provider configuration changes while using the latest configuration for future operations.
- Preserve focus within remaining stacked confirmations, restore eligible openers and provide fallback focus when an opener is unavailable.
- Honor Radix recipe Escape/outside dismissal policy and initially focus Cancel for dangerous confirmations, while preserving explicit answers and owner dismissal.
- Handle expected dismissal and unexpected failures in adoption examples without unhandled rejections.
- Avoid retaining a removal timer when a lifecycle observer disposes the provider during settlement.

### Compatibility

- 0.3.0 is a pre-1.0 minor release because the public confirmation return contract changes and handle removal waiting is added. React 18/19 peer support and the type-utils runtime dependency remain unchanged.
- The standalone Next.js example pins the published 0.2.0 baseline; the release gate replaces it only in a temporary copy with the release tarball. Snippets consume the current workspace package.

## [0.2.0] - 2026-09-14

### Added

- Allow modal definitions whose input is `void` or `undefined` to be opened without an input argument through the modal manager, registered definitions, and typed registries.
- Add verified React 18 and React 19 compatibility, including Strict Mode and independent-root coverage.
- Add tested SSR, hydration, and Next.js App Router/React Server Components guidance.
- Add compile-checked adoption examples, packed-package contract checks, lifecycle benchmarks, and reproducible competitive package checks.
- Add automated pnpm-based CI and provenance-enabled npm release workflows.

### Changed

- Move modal lifecycle ownership entirely into each `ModalProvider`, with React observing the lifecycle state directly.
- Simplify imperative modal access: pass a typed registry directly to `ModalProvider`; external registry calls route to the most recently mounted matching provider and fall back when it unmounts.
- Remove Zustand from the public installation contract. React is now the only peer dependency; `@okyrychenko-dev/type-utils` is the sole runtime dependency.
- Migrate repository development, validation, package inspection, and release workflows from npm to pnpm.
- Expand the README with provider-scope, lifecycle, registry, SSR/RSC, custom-renderer, accessibility, adoption, and troubleshooting guidance.

### Fixed

- Preserve provider lifecycle state during React Strict Mode effect replay.
- Preserve registry routing across nested providers, adjacent providers, and independent React roots.
- Make lifecycle Storybook examples repeatable after modal settlement.

[0.2.0]: https://github.com/okyrychenko-dev/react-modal-manager/compare/v0.1.0...v0.2.0
[0.3.0]: https://github.com/okyrychenko-dev/react-modal-manager/compare/v0.2.0...v0.3.0
