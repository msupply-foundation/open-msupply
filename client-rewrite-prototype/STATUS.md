# Status — front-end rewrite prototype

_Last updated: 2026-07-01_

## Current phase

Project setup / first vertical slice. Working through the "To decide" list one item at a time.

## ▶ Next action (resume here)

**Building the first vertical slice** — the outbound-shipment detail page as a styled mockup on the Decision #3 stack (Radix + Downshift + own widgets, CSS Modules + design tokens). This is the page that converts the UI-library/styling estimates into measured bundle/INP numbers. Decisions #1 (**React**), #2 (**Vite**), #3 (**UI library & styling**) are ratified — see `DECISIONS.md`.

**Carried (still open):** validate the Vite plugin-load path (Module Federation on Vite) — decision #2's validation gate.

**Carried task (prototype soon):** validate the Vite plugin-load path — build a hello-world **remote** plugin via the chosen Vite federation route (lead candidate `@module-federation/vite`) and load it at runtime into the new host sharing a single React. This is decision #2's validation gate; it's the one piece coupled to webpack today (Module Federation), so de-risk it early. See `DECISIONS.md` decision #2 for the full mechanism.

## Goal

Build **one vertical slice** of the app, end to end, that can be demoed and that validates the founding principles (React + TS, simpler UI, headless components, typed data, traceable state).

## Measured against (dev lead's spec)

The external bar now lives in [`SPEC.md`](./SPEC.md) (the dev lead's brief — distinct from Carl's decisions). Key things the prototype/demo should hit or show a credible path to:

- **Perf targets:** LCP < 2.5 s and INP < 200 ms (receiving/stocktake/dispensing) on a throttled tablet profile; app shell < 1 s from cache; bundle reduced vs current; table benchmark on a **Lenovo M10 gen2**.
- **Hard scope constraints:** no runtime CSS-in-JS, no SSR, no native app, keep current UX/modals, route-based code-splitting.
- **Capability checklist** (responsiveness/tablet, WCAG 2.2 a11y, TMF theming, RTL, plugins, JSONForms' 61 MUI-bound renderers, Command-K, month/year date picker, …) — see `SPEC.md`.

## Done

- Founding architecture doc written and agreed in principle (`2026-06-29_frontend_architecture_direction.md`).
- Context-tracking system set up (`CLAUDE.md` + `DECISIONS.md` + `STATUS.md` + `ARGUMENTS.md`).
- Decided & recorded in `DECISIONS.md`: first slice = **outbound shipment / invoice**; data = **real GraphQL backend + codegen**; framework = **React** (decision #1; Preact as a deferred bundle lever); build engine = **Vite** (decision #2; plugin-load path to be prototyped soon). Table lib (**TanStack Table**) remains a *standing recommendation* in the decision queue, not yet ratified.
- **Scaffolded the new app at [`app/`](./app/)** — Vite 8 + React 19 + TS skeleton. Verified end to end: `yarn build` (clean `tsc --noEmit` + 190 KB / 60 KB-gzip production bundle), `yarn lint` (clean), `yarn dev` (HMR dev server on :3003). No features yet — renders a placeholder page.

## In progress

- Working through the scaffold-stack decisions **one at a time** — nothing below is decided yet.

## Groundwork established (facts, not decisions)

- Schema is checked in at `server/schema.graphql` — types can be generated without running the server.
- The open-mSupply server runs on **:8000** by default; needed only for live data.
- Real outbound-shipment shapes confirmed from `client/packages/invoices/src/OutboundShipment/api/operations.graphql` (`InvoiceNode` → `lines.nodes` → `StockOutLine`).
- App scaffold setup choices (`app/`): **yarn 4** via corepack as a *standalone* project (empty `yarn.lock` marks it separate from the repo root, which has no workspaces), `node-modules` linker + 7-day supply-chain age gate (mirrors `client/.yarnrc.yml`); **TypeScript pinned to ^5.9** (matches the repo, not the brand-new TS 6 — also keeps typescript-eslint happy); dev port **:3010** (deliberately *not* the current front-end's :3003, so both run side by side); **`@/` → `src/`** import alias. Vite config is intentionally minimal + Module-Federation-compatible for the deferred plugin work.

## Decision queue — recommendations unless marked ✓ DECIDED

> Agreed order (Carl, 2026-07-01). Worked through one at a time, each with a proper argument. Notes below are Claude's current recommendation, **not** an agreed choice. Move an item into `DECISIONS.md` only once it's actually decided.

> Order keeps Carl's original six in their relative sequence, with the four additions (★) interleaved where they fit.

1. **✓ DECIDED (2026-07-01): React** — vanilla rejected; Preact held as a deferred bundle lever. Recorded in `DECISIONS.md`; argument in `ARGUMENTS.md` #2.
2. **✓ DECIDED (2026-07-01): Vite** — webpack/Rspack rejected. One carried task: prototype the runtime plugin-load path (Module Federation today) on Vite — see "Next action" and `DECISIONS.md` decision #2.
3. **✓ DECIDED (2026-07-01): UI library & styling** — per-widget hybrid: **Radix** à la carte (hard-but-covered widgets) + **Downshift** (combobox) + **own widgets** (month/year picker, Command-K); styling = **CSS Modules + CSS custom properties** (design tokens). React Aria / Ark / React-Select / vanilla-extract / Tailwind rejected. Recorded in `DECISIONS.md`; argument in `ARGUMENTS.md` #7–9. Bundle/INP to be **measured** in the slice.
4. **State management** — *performance is the priority here* (the original app's core pain). NOT decided.
5. ★ **Forms & validation** — app is form-heavy (the shipment detail is a form); approach ties directly to the re-render/perf concern, so it sits next to state. NOT decided.
6. **Query library (if any)** — e.g. TanStack Query, or none. NOT decided.
7. ★ **GraphQL transport + typed codegen** — distinct from the cache/query lib; the mechanism that delivers end-to-end types from the schema (central to the TypeScript thesis). Pairs with the query lib. NOT decided.
8. **Table library** — e.g. TanStack Table (headless). NOT decided. _(Spec: must meet WCAG 2.2 — keyboard row nav + sort-state screen-reader announcements that MRT gives out of the box — without too much manual work; plus tablet card-view, frozen columns, and the Lenovo M10 gen2 row-count benchmark. Validate before ratifying.)_
9. ★ **Routing** — list → detail navigation. NOT decided.
10. ★ **Testing strategy** — on-brand with the types/verification thesis (e.g. Vitest + Testing Library). NOT decided.

### Known requirements — consciously deferred (out of prototype scope, not forgotten)

- **i18n + RTL** (12 languages incl. Arabic), **multi-platform** (Electron/Android/Capacitor), **offline/sync**. Acknowledged; not built in the prototype slice.
- **Auth/session** — may need a minimal version just to reach the live server.

> Note (spec): the dev lead's brief treats **responsiveness/tablet, WCAG 2.2 accessibility, TMF theming, and RTL** as evaluation criteria. Even where we don't fully build them in the slice, the demo should **show how the chosen stack supports them**. See `SPEC.md`.
