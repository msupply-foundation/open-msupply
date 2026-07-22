# UI showcase

A "storybook"-type area demonstrating every component in the UI library (`src/ui/`). It is a **dev-only tool**: production builds exclude it entirely.

## Accessing it

- Run the dev server (`pnpm dev`) and open **`http://localhost:3005/#/showcase`** (the port comes from `vite.config.ts`; override with `DEV_SERVER_PORT`).
- Individual sections are linkable: `#/showcase/buttons`, `#/showcase/selectors`, `#/showcase/feedback`, … (an unknown section falls back to the first one).
- No backend or login is needed — the showcase renders instead of the app, skipping the startup flow.
- The showcase/app decision happens at page load (see `src/index.tsx`), so crossing that boundary takes a reload; switching sections _inside_ the showcase is live.

## Isolation

Nothing in the library (`src/ui/`) or the app may import from this folder — the dependency arrow only points the other way. The single entry is the guarded branch in [`src/index.tsx`](../index.tsx):

```tsx
if (import.meta.env.DEV && window.location.hash.startsWith('#/showcase')) {
  void import('./ui-showcase/ShowcaseApp')…
}
```

`import.meta.env.DEV` is statically `false` in production builds, so the branch — including the dynamic import — is dead-code-eliminated: **no showcase chunk is emitted at all**, and the app bundle carries zero showcase bytes.

## Adding a section

Add an entry to the registry in [`sections.tsx`](./sections.tsx) (id, label, component, menu category) and create the matching `<Name>Showcase.tsx` (+ optional `.module.css`) beside it. The shell derives the menu and panels from the registry; the section id becomes its hash.

## Page scaffolding (`common/`)

The chrome _around_ the demos — the section cards, lead/note copy, layout rows — is shared, one component per file in [`common/`](./common/index.ts): `Stack`, `Card`, `Row`, `Col`, `Note`, `Intro`, `PageFrame`/`PageBody`, `ToolbarStub`, `FormPreview`. A typical section page is a `<Stack>` of `<Card title lead>` blocks and owns **no CSS of its own** unless it has genuinely bespoke demo furniture (the icon gallery's glyph grid, the typography specimens, …) — that stays in the page's slim `.module.css` rather than growing single-use components in `common/`. Two rules hold: components _under demo_ are always real `src/ui` components, never showcase lookalikes; and anything in `common/` must be pure demo chrome no real page would ship.
