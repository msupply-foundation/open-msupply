# Design prototypes

Proposals built against the real component library, so an internal reviewer can
**use** a design rather than read about it. Each prototype is a working screen —
but nothing here is wired to a backend, and nothing here is necessarily agreed.

It is a **sibling of [`src/ui-showcase/`](../ui-showcase/README.md)**, with the
same harness and the opposite job.

## Why it is separate from the showcase

The showcase documents what the component library **is**. Every entry there is a
built, specified component, and a reviewer should be able to cite it as
reference.

A prototype is the opposite: an **unbuilt proposal**, often one that diverges
from a vertical's current spec. Putting the two in one gallery makes the
showcase unciteable — a reader can no longer tell "this is how the library
works" from "this is something we might do".

So the split is not tidiness, it is trust. A prototype's card on the index
carries its **status** and its **relation to spec** precisely so nobody mistakes
a proposal for the plan of record.

## Accessing it

- Run the dev server (`pnpm dev`) and open **`http://localhost:3005/#/prototypes`**
  (port from `vite.config.ts`; pin it with `DEV_SERVER_PORT` — several checkouts
  run dev servers at once and an explicit port fails loudly rather than drifting).
- Individual prototypes are linkable: `#/prototypes/catalogue-items`. An unknown
  id falls back to the index.
- No backend or login is needed — the prototypes area renders instead of the
  app, skipping the startup flow.
- The prototypes/app decision happens at page load (see `src/index.tsx`), so
  crossing that boundary takes a reload; moving between prototypes is live.

## Standalone build

`pnpm build:prototypes` emits the area as a self-contained static site in
`dist-prototypes/`; preview it with `pnpm preview:prototypes`. It has its own
entry pair — [`prototypes.html`](../../prototypes.html) →
[`src/prototypes.tsx`](../prototypes.tsx), the dev branch of `index.tsx` made
unconditional — built by
[`vite.prototypes.config.ts`](../../vite.prototypes.config.ts), which extends the
app config and renames the emitted page to `index.html` so the directory drops
onto any static host as-is. The app's own build is untouched.

Hash routing means no rewrite rules, and deep links (`…/#/prototypes/…`) work
as-is; `VITE_BASE_PATH` is honoured for non-root mounting, same as the app build.

## Published location

The deploy poller builds this from the tip of `main` and stages it into the
published tree at **`<base>prototypes/`**, alongside `<base>showcase/` — one
rsync, no separate mount or tag (see
[`deploy/README.md`](../../deploy/README.md)). It is **unauthenticated**: no
login, no data. Restrict it at the external TLS proxy if that matters — and note
it exposes in-flight design intent, which may be more sensitive than component
demos.

Because it tracks `main`, a prototype only reaches the published area once its
PR is merged.

## Isolation

The dependency arrow points one way, and it points **both** ways here:

- Nothing in the library (`src/ui/`) or the app may import from this folder.
- Nothing in this folder may import from `src/ui-showcase/`, and nothing there
  may import from here. Sharing a shell would couple the citeable reference area
  to the speculative one; the ~40 lines of duplicated chrome props in
  `PrototypesApp` are the deliberate price.

A prototype **may** import from a real vertical (`src/sections/**`) — reusing a
generated row type or real column definitions is what keeps a mock faithful
instead of a lookalike that drifts. `CatalogueItemsPrototype` does exactly that
with the items vertical, the same move `TableShowcase` makes for inbound
shipments.

The only entries are the standalone build's `src/prototypes.tsx` and the guarded
branch in [`src/index.tsx`](../index.tsx):

```tsx
if (import.meta.env.DEV && window.location.hash.startsWith('#/prototypes')) {
  void import('./prototypes/PrototypesApp')…
}
```

`import.meta.env.DEV` is statically `false` in production builds, so the branch —
including the dynamic import — is dead-code-eliminated: **no prototypes chunk is
emitted at all**, and the app bundle carries zero prototype bytes.

## Adding a prototype

1. Create a folder beside this file (`src/prototypes/<name>/`) holding the
   screen. It composes its **own** `<Page>` + `<Header>`, exactly like a real
   vertical's screen — every prototype is a full page, and the shell drops it
   straight into the content slot.
2. Add an entry to the registry in [`prototypes.tsx`](./prototypes.tsx). The
   shell derives the menu, the index and the routes from that list, and the `id`
   becomes the URL hash.
3. Fill in `status`, `summary`, `proposes` and — if it departs from what is
   specified or built — `relationToSpec`. That last field is not optional in
   spirit: an unflagged divergence is how a proposal gets mistaken for a
   decision.

### Styling

Prototypes follow the same rules as everything else — tokens only (no colour
literals), rem sizing, `--motion-*` durations, logical properties; `pnpm check`
enforces them here too. A prototype **may** own a CSS module for a shape the
library has no component for yet, scoped to that prototype and marked as such.

When a prototype is accepted, any such shape graduates into `src/ui/` as a real
element **in its own PR**, separately from the feature that first consumed it
(root `CLAUDE.md`). `catalogueItems.module.css`'s wizard stepper is the current
example.
