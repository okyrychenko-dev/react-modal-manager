# Next.js + Radix Dialog adoption

This runnable App Router example installs the library's **packed artifact**, uses a
server-rendered route with a client provider, and supplies a custom renderer plus
content-only confirmation. It uses only public package imports. Next.js, React DOM
and Radix are dependencies of this example, not of the modal-manager package.

From the repository root, with Node 22 and pnpm 11.21.0:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm pack --out examples/nextjs-dialog/react-modal-manager.tgz
pnpm --dir examples/nextjs-dialog install --no-frozen-lockfile
pnpm --dir examples/nextjs-dialog run dev
```

Open http://localhost:3000. Open a confirmation, confirm, cancel, dismiss its retained
handle, or unmount its launcher while it is open. The visible status shows each
outcome. Launcher cleanup dismisses all its pending handles; each promise chain
handles expected dismissal and reports unexpected errors.

For production use, run `pnpm --dir examples/nextjs-dialog run build` followed by
`pnpm --dir examples/nextjs-dialog run start`. To check types independently, run
`pnpm --dir examples/nextjs-dialog run typecheck`. Repack and reinstall after changing
the library. The fixture lockfile pins framework dependencies; installation allows
the local tarball checksum to change when the library is rebuilt.

## Unattended verification

```sh
pnpm exec playwright install chromium
pnpm run test:nextjs
```

The smoke command builds and packs the library, copies this example to a temporary
directory, refreshes only the local tarball checksum in its copied lockfile, installs with
`--frozen-lockfile`, typechecks, builds with Webpack, starts a production
server on an available loopback port, and exercises Chromium. It checks server HTML,
hydration/browser errors and unhandled rejections, one dialog shell, confirm/cancel,
Escape, individual handle dismissal, launcher cleanup and reopening. It also checks
focus entry, Tab containment, background pointer blocking and focus restoration,
including a removed opener and connected openers that become disabled, hidden,
inert, aria-hidden or hidden through CSS. Browser/server processes and temporary
files are cleaned up after success or failure. CI runs this command on Node 22
alongside the existing Storybook browser verification.

The exercised baseline is Next.js 16.4.2, React/React DOM 19.3.1 and Radix Dialog
1.3.1, on Node 22.20.0. The command prints its actual versions. This is one production
integration smoke check, not exhaustive support across framework versions, browsers,
bundlers or assistive technologies. No fonts or other assets are fetched at build time.

## Ownership and accessibility

- `DialogExample` is the client provider boundary. The server page never opens a
  modal. The provider renders its viewport automatically; do not add another viewport.
- `DialogRenderer` owns the single Radix modal shell, portal, focus containment and
  background interaction policy. `ConfirmationContent` supplies Radix `Title` and
  `Description` and buttons, without a nested built-in confirmation or `role="dialog"`.
- Radix dismissals reject with `ModalDismissError`; the Cancel button resolves with
  `{ confirmed: false, reason: "cancel" }`; confirmation resolves with
  `{ confirmed: true }`. The launcher narrows these typed outcomes and retains
  provider-bound handles rather than issuing deferred registry ID commands.
- There is no Radix Trigger because opening is imperative. The renderer remembers
  the opener, checks its eligibility and verifies that it actually receives focus.
  Otherwise it focuses the workspace heading, including when the opener is removed
  or remains connected but can no longer receive focus. The example uses immediate
  removal and dismissible confirmations; animations, non-dismissible dialogs and stacked dialog
  focus policies need explicit integration work before adding them.
- Keep meaningful titles/descriptions, visible focus styles and an appropriate focus
  fallback in your application. Check keyboard use, screen reader announcements,
  scroll behavior and portal placement with your actual content. These checks do not
  establish full accessibility certification.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation),
[Radix Dialog composition and accessibility](https://www.radix-ui.com/primitives/docs/components/dialog).
