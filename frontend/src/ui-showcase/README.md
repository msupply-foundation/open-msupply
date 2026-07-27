# UI showcase

A "storybook"-type area demonstrating every component in the UI library (`src/ui/`). It is a **dev-only tool**: the app's production build excludes it entirely. It can also be built as a **standalone static site** — see below.

## Accessing it

- Run the dev server (`pnpm dev`) and open **`http://localhost:3005/#/showcase`** (the port comes from `vite.config.ts`; override with `DEV_SERVER_PORT`).
- Individual sections are linkable: `#/showcase/buttons`, `#/showcase/selectors`, `#/showcase/feedback`, … (an unknown section falls back to the first one).
- No backend or login is needed — the showcase renders instead of the app, skipping the startup flow.
- The showcase/app decision happens at page load (see `src/index.tsx`), so crossing that boundary takes a reload; switching sections _inside_ the showcase is live.

## Standalone build

`pnpm build:showcase` emits the showcase as a self-contained static site in `dist-showcase/`; preview it locally with `pnpm preview:showcase`. It has its own entry pair — [`showcase.html`](../../showcase.html) → [`src/showcase.tsx`](../showcase.tsx), the dev branch of `index.tsx` made unconditional — built by [`vite.showcase.config.ts`](../../vite.showcase.config.ts), which extends the app config (same plugins and defines) and renames the emitted page to `index.html` so the directory drops onto any static host as-is. The app's own build is untouched.

No backend is needed: the only network call on the showcase path is the custom-translations fetch, which fails silently on a static host so the bundled catalogs stand on their own. Hash routing means no rewrite rules, and deep links (`…/#/showcase/buttons`) work as-is; `VITE_BASE_PATH` is honoured for non-root mounting, same as the app build.

## Isolation

Nothing in the library (`src/ui/`) or the app may import from this folder — the dependency arrow only points the other way. The only entries are the standalone build's `src/showcase.tsx` (above) and the guarded branch in [`src/index.tsx`](../index.tsx):

```tsx
if (import.meta.env.DEV && window.location.hash.startsWith('#/showcase')) {
  void import('./ui-showcase/ShowcaseApp')…
}
```

`import.meta.env.DEV` is statically `false` in production builds, so the branch — including the dynamic import — is dead-code-eliminated: **no showcase chunk is emitted at all**, and the app bundle carries zero showcase bytes.

## Adding a section

Add an entry to the registry in [`sections.tsx`](./sections.tsx) (id, label, component, menu category) and create the matching `<Name>Showcase.tsx` (+ optional `.module.css`) beside it. The shell derives the menu and panels from the registry; the section id becomes its hash.

### Keep the page metadata + TOC in sync

Each standard section page (Components + Layout) also exports a [`PageMetadata`](./metadata.ts) — the hand-authored data behind the page's Table of Contents (`common/SectionTOC`) and the not-yet-built showcase Search (`buildSearchIndex` in `metadata.ts`). It lives beside the component and **must be kept current as the showcase changes**, or the TOC links (and, later, Search) silently drift from what's on the page:

- **New section page:** export a `<name>Metadata: PageMetadata` beside the component, set it on the section's `SectionDef` (`metadata:` in `sections.tsx`), and render `<SectionTOC page={<name>Metadata} />` as the first child of the page's content `Stack`. A short or single-card page omits the render but still exports the metadata, so Search indexes it (`SectionTOC` also self-hides below two items).
- **Adding / renaming / removing / reordering a card:** update that page's `PageMetadata.items` to match. Every `item.id` must be the `id` on a real `DashboardCard` on the page — it is both the TOC scroll target and the search key — page-id-prefixed and kebab-case (e.g. `inputs-numbers`). Curated coarser groups are expected (a group's `id` sits on its first card); not every card needs an entry.
- `searchTerms` hold only the _extra_ keywords a `title` doesn't already contain — title words are indexed automatically, so don't repeat them.

## Page scaffolding (`common/`)

The chrome _around_ the demos — the section cards, lead/note copy, layout rows — is shared, one component per file in [`common/`](./common/index.ts): `Stack`, `Card`, `Row`, `Col`, `Note`, `Intro`, `PageFrame`/`PageBody`, `ToolbarStub`, `FormPreview`. A typical section page is a `<Stack>` of `<Card title lead>` blocks and owns **no CSS of its own** unless it has genuinely bespoke demo furniture (the icon gallery's glyph grid, the typography specimens, …) — that stays in the page's slim `.module.css` rather than growing single-use components in `common/`. Two rules hold: components _under demo_ are always real `src/ui` components, never showcase lookalikes; and anything in `common/` must be pure demo chrome no real page would ship.
