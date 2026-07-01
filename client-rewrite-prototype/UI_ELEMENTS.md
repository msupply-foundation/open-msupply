# UI elements — what each is built from

A living ledger of every UI element built in the prototype and **what went into it** — hand-rolled plain HTML/CSS vs. a headless library part, and *why* a library was used where it was. Update this whenever an element is added or its composition changes.

> **Convention (Decision #3).** Default is **hand-rolled**: plain semantic HTML + CSS Modules + design tokens (`app/src/styles/tokens.css`), sized in rem. We reach for a **headless** primitive only where the widget has a real accessibility/interaction contract that's tedious and risky to hand-roll (and that WCAG 2.2 grades). When we do, **we still own all the markup and CSS** — the library supplies behaviour + ARIA, not a look.
>
> Headless libs in play: **Radix** primitives (à la carte) and **Downshift** (combobox). "Hand-rolled" below = plain HTML + CSS Modules, no component library.

## Elements

| Element / part | Built with | Headless dep — and why |
|---|---|---|
| **Sidebar** — shell, nav links, rail toggle | Hand-rolled (`<nav>`/`<ul>`/`<a>`, `aria-current`) | — |
| Sidebar — expandable **sections** | Our markup + CSS | **Radix Collapsible** — disclosure a11y (`aria-expanded`/`-controls`, keyboard, `--radix-collapsible-content-height` for the animation). Tiny; no Floating UI. |
| Sidebar — **mobile overlay + hamburger** | Hand-rolled (fixed panel + scrim, CSS transform) | — (rendered via the `useIsNavOverlay` breakpoint; same `NavLists`, no duplicate mobile nav) |
| **Footer** — orange bar, cells, dividers | Hand-rolled | — |
| Footer — **language selector** | Our markup + CSS | **Radix DropdownMenu** — popup menu a11y (focus, type-ahead, keyboard) + collision-aware positioning. *First primitive to pull in Floating UI (~10 KB) — shared by every menu after.* |
| Footer — **theme toggle** (sun/moon) | Hand-rolled (`Footer/ThemeToggle`, reuses `.cell`/`.icon`) | — Just a `<button>` that flips `data-theme` on `<html>` via `theme/ThemeProvider`; the cascade recolours everything (see the theming cross-cutting note). No a11y-widget lib needed. |
| **Header** — breadcrumb | Hand-rolled (`<nav>`/`<ol>`/`<a>`) | — (just links + separators; no a11y contract needing a lib) |
| Header — **New shipment** button | Hand-rolled (`ui/Button`) | — |
| Header — **Export split-button** | Hand-rolled split shell + Radix menu for the caret | **Radix DropdownMenu** — there's no "split button" primitive; we compose a plain `<button>` (main action) + a DropdownMenu (caret → CSV/Excel). |
| Header — **Filters** menu | Our markup + CSS | **Radix DropdownMenu** (reused) |
| Header — **Status multi-select** filter | Our markup + CSS | **Radix DropdownMenu `CheckboxItem`** (reused) |
| Header — text / number inline filters | Hand-rolled (`<input>`) | — |
| Header — **Tab bar** | Our markup + CSS; sliding underline is our own measured-geometry CSS | **Radix Tabs** — the WAI-ARIA tabs pattern + roving tabindex + ←/→/Home/End (direction-aware for RTL) + tab↔panel wiring. Tiny; no Floating UI. |
| **Content footer** (pinned action bar) | Hand-rolled (`ui/Button`, blue tone) | — |
| Content footer — **Save → confirm** | Our markup + CSS (`ConfirmDialog`) | **Radix Dialog** — see below |
| **Inputs — `TextField`** (default/filled/required/error/disabled/small) | Hand-rolled (`<input>` + `<label>` + CSS) | — (company input design spec; plain input needs no lib) |
| **Selectors — native `<select>`** (plain drop-down) | Hand-rolled (`<select>` + label + our chevron) | — Short, fixed enum with no search: the browser already gives keyboard, type-ahead and the **OS-native picker on tablets** for zero JS. "Own the simple." |
| Selectors — **Radix Select** (styled drop-down) | Our markup + CSS (`ui/Select`) | **Radix Select** — same job as native, but for options that carry rich content a native `<option>` can't hold (status colour-dot, icon, two-line). Buys the `role="listbox"` + `aria-activedescendant` + typeahead / arrow-Home-End keys + RTL-aware placement contract. (Reuses the already-loaded Floating UI.) |
| Selectors — **Autocomplete / combobox** (item picker) | Our markup + CSS (`ui/Combobox`) | **Downshift `useCombobox`** — the flagged hard widget: the one selector genuinely dangerous to hand-roll (WAI-ARIA combobox = virtual focus via `aria-activedescendant`, result/active announcements, typeahead). ~3 KB, imposes no markup/style/filter — we supply the locale-aware, code-or-name filter. |
| Selectors — **Multi-select autocomplete** (tags) | Our markup + CSS (`ui/MultiSelect`) | **Downshift `useMultipleSelection` + `useCombobox`** — layers a focusable, arrow-navigable tag group + Backspace-to-remove + removal announcements onto the combobox contract. Removable chips; selection stays controlled by the parent. |
| **Confirm dialog** ("Are you sure?" modal) | Our markup + CSS | **Radix Dialog** — a modal *looks* like plain HTML, but the hard part is the a11y contract WCAG grades: focus **trap** while open, focus **restore** to the trigger on close, Escape/scrim dismiss, `role="dialog"`+`aria-modal`, label/description wiring, scroll lock, and `aria-hidden` on the background. The native `<dialog>` covers only some of this (focus-restore / trap / background-inert vary by browser) and is imperative to drive from React. Radix gives it all declaratively for ~1 KB; no Floating UI. |
| **Data table** — shell (`<table>`/`<thead>`/`<tbody>`) | Hand-rolled semantic `<table>` + CSS Modules | **TanStack Table** (headless) — row models + sorting/filter/pagination/visibility/order/sizing/pinning **state** + `flexRender`. Renders no DOM/CSS; all markup + style are ours. |
| Table — **sortable header** (`table/HeaderCell`) | Our `<th>` + `<button>` + `aria-sort` + arrow SVG | TanStack sort state (`getToggleSortingHandler`/`getIsSorted`); announcement via our live region. |
| Table — **column resize** handle | Hand-rolled focusable `role="separator"` | TanStack `getResizeHandler()` + sizing state (pointer); **arrow-key** resize is ours. Widths as CSS vars + memoised body during resize (no re-render). |
| Table — **column reorder** grip | Our grip button + `setColumnOrder` | **dnd-kit** (`@dnd-kit/core`+`sortable`+`modifiers`) — drag **and keyboard** reorder with built-in SR announcements. The one bought interaction+a11y widget. |
| Table — **frozen first column** | Our sticky CSS (`position: sticky` + offset) | TanStack pinning state (`getIsPinned`/`getStart`). |
| Table — **row states** (hover/selected/focused/restricted) | Hand-rolled CSS (`--row-bg` per state, `data-*`) | — Selected (blue) via TanStack row selection; focused (grey) via row click; restricted greying for read-only shipments. |
| Table — **cells** (`table/cells.tsx`) | Hand-rolled — numeric (…+full-precision tooltip), currency, date, text+tooltip, name+colour-dot | — Ports of the app's column types. Tooltips use native `title`. |
| Table — **comment cell** (icon → popover) | Our icon button + content | **Radix Popover** (finally in use) — opens on **click/focus** (keyboard-reachable), unlike the app's hover-only popover. |
| Table — **status cell** | **Hand-rolled `ui/StatusChip`** | — Coloured dot + `color-mix` pale pill; no a11y contract to buy. |
| Table — **selection checkbox** (`table/Checkbox`) | Hand-rolled native `<input type=checkbox>` (accent-color) | — Platform gives keyboard + SR for free; `indeterminate` set via ref. |
| Table — **columns menu** (show/hide) | Our markup | **Radix DropdownMenu `CheckboxItem`** (reuses `Menu.module.css`) driving TanStack visibility. |
| Table — **density menu** | Our markup | **Radix DropdownMenu `RadioGroup`** — compact/comfortable/spacious. |
| Table — **pagination** (`table/Pagination`) | Hand-rolled (`<select>` + prev/next buttons + aria-live count) | TanStack pagination model. |
| Table — **card view** (`table/CardList`) | Hand-rolled `<ul>` of cards from the same row model | — Markup swap at a container width (ResizeObserver), not CSS reflow; own sort control in the toolbar. |
| **Content footer — contextual** | Hand-rolled; swaps detail ↔ selection actions | — Reads the `selectionFooter` **zustand** store; one bar, two contexts (see cross-cutting note). |
| **Perf HUD** — floating benchmark window (Performance tab) | Hand-rolled (`benchmark/hud/PerfHud.tsx` + `useDraggable`) | — Dev tooling, not app chrome: a `position: fixed`, always-on-top panel dragged with plain Pointer Events + pointer capture. No a11y-widget lib needed. |
| Perf HUD — **provider segmented control** + page **mode switch** | Hand-rolled (`<button>` group, token-styled active state) | — Simple radio-like button group. |
| Perf HUD — **live metrics** | Hand-rolled; values read from a per-pane **Zustand** metrics store | — Manual render registry + `PerformanceObserver` (event-timing INP, long tasks) + rAF FPS; all production-build-safe. See `DECISIONS.md`. |
| **Render-flash** highlight (benchmark) | Hand-rolled (`useRenderTracker` layout-effect toggles a `data-flash` attr; CSS outline) | — Built-in equivalent of DevTools "highlight updates". |
| **Controlled field + readers** (benchmark form) | Hand-rolled (`<input>` / `<span>` progress bar, written once against the `StateAdapter`) | — Identical in every tier; the swappable state lives behind the adapter, not the markup. |

## Reusable primitives (`app/src/components/ui/`)

| Primitive | Built with |
|---|---|
| `Button` (orange / blue tones) | Hand-rolled |
| `TextField` | Hand-rolled |
| `NativeSelect` | Hand-rolled (`<select>` + our chevron) |
| `Select` | Radix Select wrapper — styled drop-down with custom-rendered options (adornment / two-line) |
| `Combobox<T>` | Downshift `useCombobox` wrapper — generic single-select autocomplete (renderItem + filter props) |
| `MultiSelect<T>` | Downshift `useMultipleSelection` + `useCombobox` wrapper — controlled multi-select with removable tags |
| `Tabs` (`Tabs`/`TabList`/`TabPanel`) | Radix Tabs wrapper (+ our sliding-underline logic) |
| `Dialog` | Radix Dialog wrapper (base modal — focus trap/restore, Escape, scroll lock, ARIA) |
| `ConfirmDialog` | Built on `Dialog` — the standard "Are you sure?" Cancel/OK pattern |
| `StatusChip` | Hand-rolled — coloured dot + `color-mix` pale pill; used by the table status cell |
| `DataTable<T>` | `components/table/` — TanStack-driven semantic table (sort/filter/pagination/pinning/resize/reorder/card view) |
| `useRipple` | Hand-rolled hook — subtle MUI-style click ripple (see JS note below) |
| `Menu.module.css` | Shared CSS for all Radix DropdownMenu popups |

> **JS note — `useRipple`.** Buttons are hand-rolled and mostly pure CSS (hover invert is CSS), but the click **ripple** is our one deliberate bit of interaction JS. Why it's needed: the ripple must start at the exact **pointer coordinates**, which CSS can't read, and each click spawns a fresh element so overlapping clicks animate independently. JS only supplies the per-click position + element; the animation itself is CSS, and it's skipped under `prefers-reduced-motion`.

## Cross-cutting (not a single element)

- **Design tokens** — `styles/tokens.css`, a faithful port of the current app's `theme.ts`. Hand-rolled CSS custom properties (no lib).
- **Theming (light/dark)** — `theme/ThemeProvider` (React Context, mirrors `LocaleProvider`) sets `data-theme` on `<html>` and persists to `localStorage`; the footer `ThemeToggle` flips it; a pre-paint inline script in `index.html` applies the stored theme before React mounts (no flash). Each theme is a token-override block in `tokens.css` (`:root[data-theme='dark']`) — components read tokens, so nothing else knows dark mode exists. Default is light; `prefers-color-scheme` is not consulted. See `DECISIONS.md` (2026-07-01, theming).
- **Elevation** — floating surfaces (buttons, split button, menus, dialog, Select/Combobox/MultiSelect popups, language menu, perf HUD) use the semantic **`--surface-raised`** token, not `--bg-white`. In light it *is* `--bg-white`; in dark it's **lighter** than content (`#2b2b3a` vs `#21212b`) and the `--shadow-*` tokens go **near-black**, so raised things lift on dark (lighter surface + darker shadow). Sidebar/drawer are excluded — they recede (darker than content).
- **RTL flip** — `intl/LocaleProvider` (React Context) sets `dir`/`lang` on `<html>`; formatting is browser `Intl`. It also wraps the app in Radix's **`DirectionProvider`** (one line, driven by the same locale) so every Radix widget (Select, Tabs, DropdownMenu…) gets direction-aware keyboard nav + popup placement — Radix reads `dir` from that context, not from `<html>`. Our own widgets (native select, Combobox, MultiSelect) need nothing extra: they mirror via logical properties alone.
- **Responsive** — intrinsic CSS + one `useMediaQuery` hook for the nav dock↔overlay switch. No lib.
- **Icons** — real SVG paths ported from the current app into plain React components (`components/icons`). No icon library.
- **Filter state (URL-backed)** — the header FilterBar writes filter values to the **URL query params** (source of truth), and the table reads them back as `columnFilters`; filtered views are shareable/bookmarkable. Bridged by a temporary `hooks/useUrlState` (History API + `useSyncExternalStore`, referentially stable) that swaps for router search hooks at #9. No routing lib. See `DECISIONS.md` (2026-07-01, filter state in the URL).

## Dependencies

- **In use:** `@radix-ui/react-collapsible` (sidebar sections), `@radix-ui/react-dropdown-menu` (footer language, export caret, filters, status, table columns + density menus), `@radix-ui/react-tabs` (tab bar), `@radix-ui/react-dialog` (confirm modal, wired to Save), `@radix-ui/react-select` (styled drop-down), `@radix-ui/react-popover` (table comment cell), `@radix-ui/react-direction` (app-wide RTL for Radix widgets), **`downshift`** (item combobox + multi-select), **`@tanstack/react-table`** (data table engine), **`@tanstack/react-virtual`** (table virtualisation / benchmark mode), **`@dnd-kit/core`+`sortable`+`modifiers`+`utilities`** (accessible column reorder), **`zustand`** (v5 — benchmark tiers + per-pane metrics + the selection-footer bridge; consumed headlessly); `@fontsource-variable/inter` (font).
- **Installed, not yet used:** —

_Keep this table in sync as elements are built or change (see `CLAUDE.md`)._
