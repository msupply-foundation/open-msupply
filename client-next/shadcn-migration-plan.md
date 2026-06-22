# client-next: MUI → shadcn/ui + Tailwind migration plan

Branch: `xxxx-react-tailwind-tanstack-client` (off the MUI experiment branch).

> **STATUS: IMPLEMENTED (2026-06-22).** All phases complete. Zero `@mui/*`/`@emotion/*` remain in
> `src` or `package.json`. `pnpm typecheck`, `pnpm lint` (0 errors), and `pnpm build` are green; the
> dev server boots and the login page renders live with the orange-gradient branding + primary
> focus ring (theming confirmed). An adversarial diff review found 0 confirmed regressions.
> Not yet done (need a running backend + seeded DB): live click-through of authenticated pages and
> the 5k-row stocktake re-benchmark; and the Display Settings *editor UI* for the curated branding
> tokens (the runtime branding engine is built and wired, but the Settings page itself is still a
> placeholder). The sections below are the original plan, kept for reference.

## Goal & scope

Replace **MUI (`@mui/material` + `@mui/icons-material` + Emotion)** in the existing
`client-next/` app with **shadcn/ui components styled by Tailwind**. Everything else stays:
React 19, TanStack Router/Query/Table/Virtual, React Hook Form + Zod, i18next, Zustand,
graphql-request/codegen, the data/cache/editing architecture, and the engineering charter in
`client/client-next-plan.md` §6. This is a **UI-layer swap, not a re-architecture** — routes,
queries, mutations, loaders, and form logic are untouched.

This is a hard cutover: when done, no `@mui/*` or `@emotion/*` remains in `package.json`.

## Why this is small

The MUI surface is contained and the theme is a placeholder (`createTheme({ primary: '#e95c30' })`):

- **39** files import `@mui/material`, **12** import icons, **34** use `sx=`.
- **~13** distinct components in wide use (Box, Stack, Typography, Button, IconButton,
  TextField, Autocomplete, Chip, CircularProgress, Divider, Paper, InputAdornment,
  TablePagination) + the Table family (DataTable), the Drawer/List family (NavDrawer),
  Dialog, and Snackbar/Alert.
- **24** distinct icons, all with `lucide-react` equivalents.
- No Tailwind/PostCSS config exists yet → clean install.

## Stack decisions

- **Tailwind v4** with the `@tailwindcss/vite` plugin (CSS-first config via `@theme` in
  `globals.css`; no `tailwind.config.js`). This is what the shadcn CLI scaffolds for Vite today.
- **shadcn/ui** (copy-in components under `src/components/ui/`, owned by us — same "rebuild
  `common` lean" philosophy as the original plan). Brings Radix primitives + CVA + tailwind-merge.
- **Icons: `lucide-react`** (shadcn's default set) replaces `@mui/icons-material`.
- **Toasts: `sonner`** (shadcn's toast) replaces MUI `Snackbar`/`Alert`.
- **No Box/Stack re-wrappers.** Replace layout primitives with plain elements + Tailwind classes
  + a `cn()` helper. Resist rebuilding a `<Box sx>` clone — that just re-creates the runtime
  style churn the charter warns against.
- **Theme tokens** live as CSS variables in `globals.css`; mSupply orange `#e95c30` becomes
  `--primary` (single source of truth, replacing `theme.ts`).

## Theming & colour scheme (full parity, runtime-configurable)

Theming is a first-class requirement, not an afterthought — and shadcn/Tailwind handles it *better*
than MUI did, because the whole system is **CSS custom properties**, which can be overridden at
runtime without recreating a theme object. The legacy client (`client/packages/common/src/styles/`)
has two layers we must preserve:

**1. A rich semantic palette (static base).** Legacy `themeOptions` is far more than `primary` —
it defines domain-semantic colour groups used throughout the app:
`primary` (#e95c30) / `secondary` (#3e7bfa) / `error` / `info`, a `gray` scale, `border`/`divider`,
many `background.*` variants (drawer/menu/toolbar/row/login/input…), `form` (field/label), plus
**business-domain tokens**: `cceStatus` (cold-chain equipment states), `invoiceLineStatus`,
`vaccinationStatus`, `programs`, `chart.lines[]`, gradients, custom shadows, Inter-Variable
typography, custom breakpoints (sm 601 / md 1025 / lg 1441 / xl 1537), and a `tableHeader` z-index.

→ **Port all of it to CSS variables in `globals.css`**, exposed to Tailwind via `@theme inline`:
  - Brand/UI tokens map onto shadcn's standard names (`--primary`, `--secondary`, `--muted`,
    `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`, …).
  - Domain tokens that shadcn has no slot for become their own vars and Tailwind utilities, so the
    scheme stays centralised and semantic exactly like the MUI palette did — e.g.
    `--color-cce-functioning` → `text-cce-functioning`, `--color-invoice-pending` → `bg-invoice-pending`,
    `--color-chart-1..6`. **Rule: components reference semantic tokens, never raw hex** (the Tailwind
    analog of "use `theme.palette.x`, not a literal"). Optionally add an ESLint guard against hex in
    `className`.
  - Override Tailwind's `--breakpoint-sm/md/lg/xl` to the legacy values so the `useMediaQuery` hook
    and responsive utilities match today's layout.
  - Dark mode comes essentially free via a `.dark` block if wanted later (legacy had none — a bonus, not a requirement).

**2. Runtime, server-distributed branding (the rebrand feature) — must keep.** Legacy flow
(`Login.tsx` + `DisplaySettings.tsx` + `useAppTheme`): on login the client queries
`displaySettings({ customThemeHash, customLogoHash })`; the server returns a `customTheme`/`customLogo`
(value + hash) **only when the hash changed**; the client caches them in localStorage
(`/theme/custom`, `/theme/customhash`, `/theme/logo`, `/theme/logohash`) and deep-merges the theme over
the base. A ServerAdmin edits it via Display Settings → `updateDisplaySettings`. This lets a
deployment rebrand colours + logo for all its clients with no rebuild.

→ **client-next keeps the same server contract**, applied the CSS-var way: a small `applyBranding()`
runs at startup/login — fetch `displaySettings` with the cached hashes (react-query), and on change
**set CSS custom properties on `:root`** (`document.documentElement.style.setProperty('--primary', …)`)
instead of rebuilding a theme. No `ThemeProvider` re-render; the cascade does the work. The logo
(`/theme/logo`) feeds the logo component (replaces `MSupplyGuy` when set).

**Branding payload shape — DECIDED: curated token schema.** Legacy stores a *free-form partial MUI
`ThemeOptions` JSON* (admins paste `{ palette: { primary: { main: '#…' } }, … }`), tied to MUI
internals and not droppable into CSS vars. client-next instead defines a **small, documented set of
overridable brand tokens** (e.g. `{ primary, secondary, error, info, logo }`) that map to CSS vars —
more robust and admin-friendly than pasting MUI internals. A **back-compat reader** pulls
`palette.*.main` (and `customLogo`) out of any legacy free-form JSON still stored on a server, so
existing deployments keep their branding; the handful of existing server-stored themes get migrated
to the new shape. The Display Settings editor is rebuilt around the curated fields (ideally simple
colour inputs rather than a raw JSON textarea).

This work is **Phase 0.5** (right after Foundation, before feature migration): land the full token set
+ `applyBranding()` so every migrated component consumes real tokens from day one.

## Component / API mapping

| MUI | Replacement |
|---|---|
| `ThemeProvider` + `createTheme` (`theme.ts`) | CSS variables in `globals.css`; delete `theme.ts` |
| `CssBaseline` | Tailwind preflight + `globals.css` base layer |
| `Box`, `Stack` | `<div>` + Tailwind flex/grid utilities |
| `Typography` | `<p>/<h*>/<span>` + text utilities |
| `Paper`, `Divider` | shadcn `Card` / `Separator` (or a bordered `<div>`) |
| `Button`, `IconButton` | shadcn `Button` (`variant`/`size="icon"`) |
| `TextField` + `InputAdornment` | shadcn `Input` + `Label`; adornment via a flex wrapper |
| `Autocomplete` | shadcn **Combobox** (`Command` + `Popover`) — new `SearchSelect` wrapper |
| `Chip` | shadcn `Badge` |
| `CircularProgress` | `lucide` `Loader2` spinner (`animate-spin`) |
| `TablePagination` | new `DataTablePagination` (Button + `Select`) — shadcn's documented pattern |
| `Table*` family (DataTable) | shadcn `Table` (styled HTML table, no Radix); keep TanStack headless |
| `Drawer` (mobile) | shadcn `Sheet` |
| `Drawer` (permanent desktop) | styled `<aside>` sidebar (plain Tailwind) |
| `List`/`ListItemButton`/`ListItemIcon`/`ListItemText` | `<nav>`/`<button>`/`<a>` + Tailwind |
| `Collapse` | shadcn `Collapsible` |
| `Popover` | shadcn `Popover` |
| `Badge` (count) | shadcn `Badge` positioned absolutely, or a small custom count badge |
| `Dialog` (LineEditDialog, SyncModal) | shadcn `Dialog` |
| `useConfirm` (confirm Dialog) | shadcn `AlertDialog` |
| `Snackbar` / `Alert` | `sonner` `toast.*` |
| `useMediaQuery(theme.breakpoints.down('sm'))` | small `useMediaQuery('(max-width: 639px)')` hook (matches Tailwind `sm`) |
| `@mui/icons-material/*` | `lucide-react` (Dashboard→LayoutDashboard, LocalShipping→Truck, etc.) |

## Phased steps

Follow the original plan's **parallel sub-agent recipe**: do the shared/foundation work
centrally first, get a green typecheck base, then fan out feature files (each agent owns its own
files, no shared edits, no whole-project typecheck).

**Phase 0 — Foundation (central, one PR-able chunk).**
1. Add deps: `tailwindcss @tailwindcss/vite`, `class-variance-authority clsx tailwind-merge`,
   `lucide-react`, `sonner`, `tailwindcss-animate`, plus the Radix packages shadcn pulls per
   component. Remove nothing yet.
2. Add the `@tailwindcss/vite` plugin to `vite.config.ts`; create `src/index.css`/`globals.css`
   with `@import "tailwindcss";`, the `@theme` tokens, and `--primary: #e95c30`. Import it once
   in `main.tsx`.
3. `npx shadcn@latest init` → writes `components.json`. Confirm aliases map to `@/components/ui`
   and `@/lib/utils` (the `@/*` path alias already exists in `tsconfig.json` + `vite.config.ts`;
   add `baseUrl: "."` to tsconfig if the CLI requires it). Add `cn()` to `src/lib/utils.ts`.
4. **MUI and Tailwind run side by side during the migration.** Keep `ThemeProvider`/`CssBaseline`
   mounted until MUI is gone; mount `<Toaster />` (sonner) now. (See Risks for the preflight clash.)

**Phase 1 — Primitive layer (central).** Generate/adapt the shadcn components used everywhere
and the custom wrappers, so feature work has a stable base:
`button, input, label, badge, separator, card, dialog, alert-dialog, sheet, popover, command,
collapsible, select, table, sonner` + custom `SearchSelect` (Autocomplete replacement),
`DataTablePagination`, and a `useMediaQuery` hook. Verify these render in isolation. Green
typecheck.

**Phase 2 — Migrate by group (fan out, leaf → shell):**
- **A. Tables + lists:** `DataTable.tsx`, `DataTablePagination`, then the 9 list pages
  (Stock, Customers, Suppliers, the 4 invoice lists, 2 requisition lists). Swap `Table*` +
  `TablePagination`; TanStack Table state is unchanged.
- **B. Detail framework:** `components/detail/*` (DetailHeaderBar, StatusBar, LineEditDialog →
  Dialog, ItemSearchInput + NameSearchInput → SearchSelect, useConfirm → AlertDialog, inputs.ts).
- **C. Editor pages (8):** inbound/outbound shipment, customer/supplier return, internal order,
  customer requisition, customers, suppliers detail pages — Snackbar→`toast`, Dialog, the
  `useMediaQuery` hook for the card/grid swap.
- **D. Stocktake (perf-critical, do carefully):** `StocktakeGrid.tsx` + list. It already uses
  **native inputs/selects** (not MUI inputs) for the virtualized rows, so the change is mostly the
  surrounding chrome + `useMediaQuery` + the error Snackbar. Keep fixed-height virtualization and
  the `top: vi.start` (no-transform) row positioning. **Re-run the 5k-row benchmark after this group.**
- **E. Shell:** `AppLayout.tsx`, `NavDrawer.tsx` (Drawer→Sheet + sidebar, List→nav, Collapse→
  Collapsible, Popover, Badge, store-search TextField→Input), `login.tsx`, `SyncModal.tsx`,
  `PlaceholderPage.tsx`, `SearchField.tsx`. (`MSupplyGuy.tsx` is an inline SVG — no change.)

**Phase 3 — Remove MUI (central).** Delete `theme.ts`; drop `@mui/material`, `@mui/icons-material`,
`@emotion/react`, `@emotion/styled` from `package.json`; remove `ThemeProvider`/`CssBaseline`
from `main.tsx`. `grep -r '@mui\|@emotion' src` must be empty. Final typecheck + lint + build.

## Risks & mitigations

1. **Tailwind preflight vs MUI during coexistence (top risk).** Preflight resets `button`,
   heading margins, and box-sizing, which can visually disturb still-MUI components mid-migration.
   Mitigation: keep Phases 1→2 tight and sequential so coexistence is brief; if a clash bites,
   temporarily scope/disable preflight until Phase 3. Not a production concern — they never ship
   together.
2. **Autocomplete → Combobox** is the only non-trivial behavioral port (debounced server search,
   `filterOptions={x=>x}`, loading/no-options text, controlled value). Build `SearchSelect` once
   in Phase 1 against `ItemSearchInput`'s contract, reuse for `NameSearchInput`.
3. **Stocktake performance** is the headline metric (LCP 1107ms / CLS 0 @ 5k rows). Migrate it
   last among features and re-benchmark; the heavy rows already use native inputs so risk is low,
   but verify no Radix/portal regressions and that fixed-size virtualization is preserved.
4. **`useMediaQuery` JS branches** (card-vs-grid swaps in 7 files) need a real hook, not just CSS,
   because the component returns different trees. Provide `useMediaQuery('(max-width: 639px)')`
   aligned to Tailwind's `sm` so behavior matches today's `breakpoints.down('sm')`.
5. **Bundle/CI:** removing MUI + Emotion should *shrink* the bundle below the current
   0.28 MB gzip — assert it in the final benchmark, don't just assume.

## Verification gates (per phase)

- `pnpm typecheck` + `pnpm lint` green after each group.
- Live smoke at `:3004` (`pnpm dev`, login `Admin`/`pass`): nav shell, a list page, a detail
  editor save, and the stocktake inline-edit→save path.
- After Phase 2D: re-run the chrome-devtools 5k-stocktake LCP/CLS benchmark.
- After Phase 3: `pnpm build` clean, no `@mui`/`@emotion` in src or deps, record new bundle size.
