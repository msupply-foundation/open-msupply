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
| **Confirm dialog** ("Are you sure?" modal) | Our markup + CSS | **Radix Dialog** — a modal *looks* like plain HTML, but the hard part is the a11y contract WCAG grades: focus **trap** while open, focus **restore** to the trigger on close, Escape/scrim dismiss, `role="dialog"`+`aria-modal`, label/description wiring, scroll lock, and `aria-hidden` on the background. The native `<dialog>` covers only some of this (focus-restore / trap / background-inert vary by browser) and is imperative to drive from React. Radix gives it all declaratively for ~1 KB; no Floating UI. |

## Reusable primitives (`app/src/components/ui/`)

| Primitive | Built with |
|---|---|
| `Button` (orange / blue tones) | Hand-rolled |
| `TextField` | Hand-rolled |
| `Tabs` (`Tabs`/`TabList`/`TabPanel`) | Radix Tabs wrapper (+ our sliding-underline logic) |
| `Dialog` | Radix Dialog wrapper (base modal — focus trap/restore, Escape, scroll lock, ARIA) |
| `ConfirmDialog` | Built on `Dialog` — the standard "Are you sure?" Cancel/OK pattern |
| `useRipple` | Hand-rolled hook — subtle MUI-style click ripple (see JS note below) |
| `Menu.module.css` | Shared CSS for all Radix DropdownMenu popups |

> **JS note — `useRipple`.** Buttons are hand-rolled and mostly pure CSS (hover invert is CSS), but the click **ripple** is our one deliberate bit of interaction JS. Why it's needed: the ripple must start at the exact **pointer coordinates**, which CSS can't read, and each click spawns a fresh element so overlapping clicks animate independently. JS only supplies the per-click position + element; the animation itself is CSS, and it's skipped under `prefers-reduced-motion`.

## Cross-cutting (not a single element)

- **Design tokens** — `styles/tokens.css`, a faithful port of the current app's `theme.ts`. Hand-rolled CSS custom properties (no lib).
- **RTL flip** — `intl/LocaleProvider` (React Context) sets `dir`/`lang` on `<html>`; formatting is browser `Intl`. No UI library involved.
- **Responsive** — intrinsic CSS + one `useMediaQuery` hook for the nav dock↔overlay switch. No lib.
- **Icons** — real SVG paths ported from the current app into plain React components (`components/icons`). No icon library.

## Dependencies

- **In use:** `@radix-ui/react-collapsible` (sidebar sections), `@radix-ui/react-dropdown-menu` (footer language, export caret, filters, status), `@radix-ui/react-tabs` (tab bar), `@radix-ui/react-dialog` (confirm modal, wired to Save); `@fontsource-variable/inter` (font).
- **Installed, not yet used:** `@radix-ui/react-popover` (for upcoming popovers), **`downshift`** (for the item combobox — next, on the Selectors tab).

_Keep this table in sync as elements are built or change (see `CLAUDE.md`)._
