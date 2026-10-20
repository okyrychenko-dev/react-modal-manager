# Next.js + Radix Dialog adoption

This runnable App Router example installs the published library from **npm**, uses a
server-rendered route with a client provider, and supplies a custom renderer plus
custom confirmation surface. It uses only public package imports. Next.js, React DOM
and Radix are dependencies of this example, not of the modal-manager package.

From the repository root, with Node 22 and pnpm 11.21.0:

```sh
pnpm --dir examples/nextjs-dialog install --frozen-lockfile
pnpm --dir examples/nextjs-dialog run dev
```

Open http://localhost:3000. Open a confirmation, confirm, cancel, dismiss its retained
handle, or unmount its launcher while it is open. The visible status shows each
outcome. Launcher cleanup dismisses all its pending handles; each promise chain
handles expected dismissal and reports unexpected errors.

For production use, run `pnpm --dir examples/nextjs-dialog run build` followed by
`pnpm --dir examples/nextjs-dialog run start`. To check types independently, run
`pnpm --dir examples/nextjs-dialog run typecheck`. The example manifest and lockfile pin the published package and framework
dependencies. No local package archive is needed for ordinary use.

The committed dependency remains the published **0.2.0** baseline. The repository prepares **0.3.0**; its default packed smoke verifies that candidate without requiring npm publication. Snippets use the current workspace version. Update this standalone npm pin and lockfile after 0.3.0 is published, rather than declaring an unavailable registry version.

## Unattended verification

```sh
pnpm exec playwright install chromium
pnpm run test:nextjs
# Run the same browser scenarios against the published dependency:
pnpm run test:nextjs --published
```

The smoke command builds and packs the library, copies this example to a temporary
directory, redirects only its copied manifest and package resolution to the fresh
tarball, preserves external lockfile entries, installs with
`--frozen-lockfile`, typechecks, builds with Webpack, starts a production
server on an available loopback port, and exercises Chromium. It checks server HTML,
hydration/browser errors and unhandled rejections, one dialog shell, confirm/cancel,
Escape/outside dismissal policies, safe initial focus, individual handle dismissal, launcher cleanup and reopening. It also checks
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
- `DialogRenderer` owns the Radix root, portal and overlay. Each content component
  composes one `DialogSurface` (`Dialog.Content`), which retains focus containment
  and shared focus restoration. This lets `ConfirmationContent` supply the policy
  directly to supported Radix events without a nested dialog.
- Use **Dismissal policy** to choose omitted/default, enabled or disabled. Omitted
  and `true` allow Escape and outside interaction; `false` prevents those dismissals
  through `onEscapeKeyDown` and `onInteractOutside`. Explicit Cancel/Confirm and
  owner-bound `handle.dismiss()` remain available in every mode.
- Enable **Dangerous confirmation** to focus Cancel on open. Other variants focus
  Confirm. The confirmation still supplies meaningful Radix `Title` and
  `Description`. See the [Radix Content API](https://www.radix-ui.com/primitives/docs/components/dialog#content).
- Radix dismissals reject with `ModalDismissError`; the Cancel button resolves with
  `{ confirmed: false, reason: "cancel" }`; confirmation resolves with
  `{ confirmed: true }`. The launcher narrows these typed outcomes and retains
  provider-bound handles rather than issuing deferred registry ID commands.
- There is no Radix Trigger because opening is imperative. The renderer remembers
  the opener, checks its eligibility and verifies that it actually receives focus.
  Otherwise it focuses the workspace heading, including when the opener is removed
  or remains connected but can no longer receive focus. The basic confirmation uses immediate removal. The customer workflow below adds
  a bounded closing visual and a focus policy for sequential dialogs. More complex
  stacks still need checks with your application's content.
- Keep meaningful titles/descriptions, visible focus styles and an appropriate focus
  fallback in your application. Check keyboard use, screen reader announcements,
  scroll behavior and portal placement with your actual content. These checks do not
  establish full accessibility certification.

References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation),
[Radix Dialog composition and accessibility](https://www.radix-ui.com/primitives/docs/components/dialog).

## Sequential customer workflow

Use **Start customer flow** to select Ada or Grace, edit the name, and confirm the
change. Data passes through `createModal` input/result types without assertions.
Only confirmation displays `Saved: …`; Cancel at any step stops the flow, while
Escape rejects with a distinct dismissal outcome. Reopening starts from the same
local customer data. This demo does not persist to a backend.

`CustomerFlowLauncher` retains each public handle while awaiting it. Unmounting the
launcher marks the run inactive before dismissing pending handles. Every await
checks that run before opening the next step or updating state. The confirmation
contains an **Unmount flow launcher** control to exercise cleanup and reopening.
Application code directly imports `isError` and `isInstanceOf` from
`@okyrychenko-dev/type-utils` (a direct dependency in this fixture).

Enable **Show 600 ms exit visuals** to retain a noninteractive closing marker for
600 ms after settlement. The next dialog opens immediately; the previous instance
remains in `closing` until the provider timer removes it. The renderer removes the
Radix shell immediately and substitutes an inert, aria-hidden visual marker, so an
old shell cannot retain keyboard or pointer ownership. Its CSS fade lasts 600 ms;
reduced motion hides the marker immediately while the bounded removal timer still
runs. This deliberately demonstrates lifecycle timing rather than preserving a
snapshot of the old form. It does not await a DOM transition or report animation
completion; timer throttling can delay removal.

Focus remains in an active dialog when an older shell closes. At the end of the
customer flow, the renderer restores a connected eligible opener or the flow's
start button. If the launcher was removed, it uses the workspace heading. The
example has one shell per active instance and meaningful titles/descriptions.
These checks do not certify every assistive technology or a shadcn adapter.

## Local render-error recovery

**Open failing dialog** deliberately throws beneath `ModalContentBoundary`, inside
the existing shell. The boundary displays an accessible fallback, with the handle
still pending. **Dismiss failed dialog** calls the content's public `dismiss`,
rejecting that operation with `ModalDismissError`; Escape has the same outcome.
The caller catches it and displays a settlement count. The failed instance is
removed, and another open creates a fresh boundary. No success continuation runs.

**Open recovery neighbor** first opens an unrelated confirmation. Its description
can open the failing dialog above it. Recover locally, then complete the still
pending neighbor: the Provider and the unrelated handle survive the local error.
The browser smoke verifies the fallback, pending state, exactly one settlement per
failed operation, surviving neighbor, focus and reopening. Only the two exact
intentional render-error reports from these scenarios are accepted; unrelated
errors and all unhandled rejections fail verification.

A boundary that only hides content leaves its handle pending. This recipe chooses
explicit user dismissal; another application can reject through the existing
content `reject(error)` callback, provided it gives recovery UI a separate owner
that survives removal. A boundary above the Provider that unmounts it instead
triggers existing `provider-unmount` dismissal of every pending operation in that
Provider. The core adds no automatic render-error rejection policy.

The launchers use `manager.open(confirmation, input)` when they need an owned
confirmation handle. This works with the published `0.2.0` contract, whose
`manager.confirm()` returns a plain Promise, as well as the current checkout.
The committed example always declares an npm version; the packed smoke changes
only its disposable copy and never writes a tarball dependency back to the example.
