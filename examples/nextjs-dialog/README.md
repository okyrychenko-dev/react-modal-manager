# Next.js + Radix Dialog adoption

This App Router example uses the current packed library, a server-rendered route,
and a client Provider with a custom Radix renderer and confirmation surface. All
library imports use the public package entry point. Next.js, React DOM and Radix
remain example dependencies.

From the repository root, with Node 22 and pnpm 11.21.0:

```sh
pnpm install --frozen-lockfile
pnpm run preview:nextjs
```

The preview builds and packs the current library, creates a temporary copy of this
application, redirects its modal-manager dependency to that tarball, and preserves
all external lockfile resolutions. It installs with `--frozen-lockfile`, typechecks,
builds and starts a production server. Open the printed loopback URL. Ctrl+C stops
the server and removes the temporary copy. The checked-in manifest and lockfile
remain unchanged. This preview does not require Playwright Chromium or npm
publication and does not provide development hot reload.

The source now imports the unreleased public `useOwnedModalHandles` hook. The
committed npm pin remains **0.2.0** as lockfile input for the packed fixture; that
version cannot run this updated source directly. Use the packed commands until a
compatible version is published and the pin and lockfile can be updated together.
Do not substitute an unpublished registry version.
`pnpm run lint:nextjs` uses this example's `eslint.config.mjs` and
`tsconfig.lint.json` to check consumers against the built workspace declarations;
the packed smoke independently checks the actual installed artifact. To develop with hot reload,
install a compatible packed artifact in an isolated copy of the example and run
its existing `dev` command.

## Unattended verification

```sh
pnpm exec playwright install chromium
pnpm run test:nextjs
```

The smoke performs the same packed installation and production build as the
preview, then exercises Chromium. It checks server HTML, hydration errors and
unhandled rejections, confirmation answers and dismissal policies, initial focus,
individual cancellation, launcher cleanup and reopening. It also checks focus
containment/restoration, unavailable openers, sequential and delayed customer
flows, and local render-error recovery. Processes and temporary files are cleaned
up after success or failure. CI runs it on Node 22.

`pnpm run test:nextjs --published` is retained for future compatible npm pins. The
current pinned baseline lacks the hook, so that mode stops with an explicit
availability error before building; it does not silently fall back to copied
source or treat the current source as published.

The fixture pins Next.js 16.4.2, React/React DOM 19.3.1 and Radix Dialog 1.3.1.
Verification prints actual versions. No fonts or other assets are fetched at
build time. This production smoke is not exhaustive accessibility certification
or support for every framework/browser combination.

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

## Retained-handle ownership

The confirmation, recovery and customer-flow launchers import
`useOwnedModalHandles` directly from the public modal-manager package; no ownership
source needs to be copied. `track(handle)` preserves the result or rejection and
forgets settled handles. `dismissAll()` dismisses pending retained handles;
launcher teardown also dismisses them automatically. Keep the original handle for
individual cancellation and `whenRemoved()`; tracking does not wait for removal,
animation or focus restoration.

Outcome policy stays with the caller: the confirmation launcher reports dismissal
to its surviving parent after unmount. The customer flow prevents concurrent runs
and captures `const isActive = owner.captureLifetime()` before starting. It checks
that guard before updating local state or opening another step. The scope-isolation
snippet similarly suppresses stale local outcomes. Captured guards stay invalid
after cleanup even if effects reconnect. Use the hook from event handlers or
passive effects; tracking after cleanup immediately dismisses the supplied handle.
