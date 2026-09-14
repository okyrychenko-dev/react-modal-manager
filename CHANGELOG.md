# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
