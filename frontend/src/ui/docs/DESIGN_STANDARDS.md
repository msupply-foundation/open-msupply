# Design standards alignment

How we move this app's UI toward the organisation's brand design standards, and a living record of what's been reconciled. The process lives at the top (stable); the [Status](#status) table, [Open decisions](#open-decisions-awaiting-carl), and [Ledger](#ledger) grow as we work through the standards section by section.

## The upstream source

The standards live at **https://msupply-foundation.github.io/ui-standards/** — a single static HTML document (not a JS app), organised by component with stable anchors (`#btn-variants`, `#field-sizes`, `#type-scale`, …). It carries concrete, machine-readable values: hex colours, rem/px sizes, states, breakpoints. It is **work in progress and not fully locked in** (Carl, 2026-07-21), so values will move; that is exactly why we sync incrementally rather than copy once.

Sections present upstream: Typography, Tables, Input Fields, Buttons, Search, Modals & Drawers, Navigation, Tabs, Errors & Feedback, Accessibility.

**Read it precisely, not casually.** `WebFetch` runs the page through a small summarising model that rounds and occasionally mis-attributes values — an early fetch reported `#e95c30` as "danger red" when that hex is in fact our brand TMF Orange. So when reconciling a section, pull the **raw** HTML/CSS of that section's anchor and work from the literal values, never from a summary.

## The single source of truth is our tokens

Components never read the standards site; they read tokens. Every concrete value from the standard lands in [`../styles/tokens.css`](../styles/tokens.css) (a token added to the theme contract with a dark override, per the styling principles in [`../CLAUDE.md`](../CLAUDE.md) — no hard-coded colours, no px for spacing/dimensions). The site is an **upstream we sync from**, not something we paste into component CSS. That keeps the WIP drift contained to one file and one ledger, and means a component "matches the design" precisely when its tokens do.

## The reconciliation loop

Run this per standards section (per component), smallest useful unit first:

1. **Fetch raw.** Pull the section's exact values from the upstream anchor (not a summary).
2. **Diff.** Compare against the current component + the tokens it consumes.
3. **Report.** Produce a three-bucket reconciliation report:
   - ✅ **Matches** — already aligned, no action.
   - ⚠️ **Conflicts** — we differ, and the difference is a real decision (brand/UX), not a typo. These are **surfaced for Carl, never silently overwritten.**
   - ➕ **Gaps** — the standard specifies something we have no token/component for yet.
4. **Decide.** Carl rules on each ⚠️ conflict. Record the ruling under [Open decisions](#open-decisions-awaiting-carl) → resolved.
5. **Implement** against tokens; run `pnpm check`.
6. **Verify** by rendering (dev server / screenshot) — static checks can't catch "compiles clean but looks wrong".
7. **Record** the section's outcome in the [Ledger](#ledger) and flip its [Status](#status) row.

## Status

| Standard section  | Status      | Last synced | Notes                                                                    |
| ----------------- | ----------- | ----------- | ------------------------------------------------------------------------ |
| Typography        | Not started | —           |                                                                          |
| Tables            | Not started | —           |                                                                          |
| Input Fields      | Not started | —           |                                                                          |
| Buttons           | Reconciled  | 2026-07-21  | Adopted in full (decisions #1–#4); see ledger for deviations + deferrals |
| Search            | Not started | —           |                                                                          |
| Modals & Drawers  | Not started | —           |                                                                          |
| Navigation        | Not started | —           |                                                                          |
| Tabs              | Not started | —           |                                                                          |
| Errors & Feedback | Not started | —           |                                                                          |
| Accessibility     | Not started | —           |                                                                          |

Status values: **Not started** → **In review** (report produced, awaiting decisions) → **Reconciled** (implemented + verified).

## Open decisions (awaiting Carl)

Brand/UX conflicts that need a human ruling before implementation. Each is resolved in place (don't delete — record the decision) so the reasoning survives.

| #   | Section | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Status                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Buttons | **Primary colour flips to blue; brand orange demotes to ghost.** Confirmed against raw source: the standard's primary is a blue contained fill (`--highlight-blue` #3E7BFA — our `--secondary-main`), and the ghost (tertiary) variant is the one that carries brand orange (`--tmf-orange` #F26532 ≈ our `--primary-main`). So "primary action = orange" is no longer the model. Adopt the flip?                                                                                                                                             | **Resolved 2026-07-21 — adopted** (Carl). Primary → `--secondary-main` (blue) fill; new ghost variant carries `--primary-main` (orange).                                                                                                                                                                                                             |
| 2   | Buttons | **Adopt the flat button language, retiring the shadowed-orange-pill?** The standard is flat: 4px radius (`0.25rem`), a solid fill at rest for primary, an outlined secondary (1px `#E0E0E0` border, charcoal text), and a text-only ghost. Ours is the current app's `BaseButton` — a 24px pill (`--radius-button`) on a raised white surface + `--shadow-2`, no fill at rest, inverting to a coloured fill only on hover. These are incompatible looks; matching the standard means replacing our button's core visual model, not tuning it. | **Resolved 2026-07-21 — adopted** (Carl). Flat `--radius-sm` (4px), filled primary/danger, outlined secondary, text ghost; rest elevation removed (shadow only on filled hover).                                                                                                                                                                     |
| 3   | Buttons | **Two sizes + a ≤1023px touch-growth, reversing our deliberate no-bump?** Standard has medium (36px) + small (28px), and grows `.btn:not(.btn-sm)` to 48px / 1rem font at ≤1023px. Our Button is a single fixed 40px height with **no** size prop and a documented decision to _remove_ the touch bump (it made buttons taller than the SplitButton in device-emulation — see the note at the foot of `Button.module.css`). Re-introduce the small size and the touch growth?                                                                 | **Resolved 2026-07-21 — adopted** (Carl). Added a `size` prop (medium 36px / small 28px); medium grows to `--touch-target` (48px) at ≤1023px via a width query (= `breakpoints.navOverlay`), not `pointer:coarse` — which sidesteps the device-emulation inflation that got the old bump removed.                                                    |
| 4   | Buttons | **Match the standard's focus ring and disabled treatment?** Standard focus = 3px blue glow (`outline: 3px solid rgba(62,123,250,0.5)`); disabled = whole-button `opacity: 0.38` + `not-allowed` cursor + `pointer-events: none`. Ours = 2px solid `--primary-main` (orange) outline, and disabled greys only the label/icon to `--gray-light` while the pill keeps its surface + shadow. Both are token-level and follow from #1–#2, but flagged so they aren't lost.                                                                         | **Resolved 2026-07-21 — adopted** (Carl). Disabled → whole-button `opacity: 0.38` + `not-allowed`. Focus → a 3px `outline` (not box-shadow, so overflow:hidden can't clip it) in `--secondary-main`, danger in `--error-main`. NB button focus is now blue while the rest of the app's focus ring is still orange — reconcile in a later focus pass. |

## Ledger

One subsection per reconciled standards section. Fill it as step 7 of the loop. Format per section:

- A short prose note on scope + any deviations we chose (with the reason).
- A property table:

| Property | Standard value | Our token | Status | Notes |
| -------- | -------------- | --------- | ------ | ----- |

Status per row: `match` / `conflict → resolved (see decision #N)` / `gap → added token` / `gap → deferred`.

### Buttons — _reconciled 2026-07-21_

Raw source: `#btn-variants`, `#btn-sizes`, `#btn-layout`, `#btn-states` (fetched literal, not summarised). Component compared: [`../elements/buttons/Button.module.css`](../elements/buttons/Button.module.css). **Headline:** this is not a token tweak — the standard describes a different button design language from our current shadowed-orange-pill `BaseButton`. Most rest-state values conflicted by design. All were resolved by adopting the standard (decisions #1–#4); the table below is the before→after diff (the "Ours (before)" column is the pre-adoption state), with deliberate deviations + deferrals listed after it.

| Property            | Standard value                                     | Ours (before)                                                      | Status                    |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| Font size (medium)  | `0.875rem`                                         | `--text-sm` (0.875rem)                                             | match                     |
| Font weight         | 500                                                | `--weight-medium` (500)                                            | match                     |
| Gap between buttons | `0.5rem`                                           | `--space-2` (0.5rem)                                               | match                     |
| Label case          | sentence case (no transform)                       | no transform                                                       | match                     |
| Loading state       | spinner + label swap ("Saving…")                   | spinner (currentColor ring)                                        | match (shape differs)     |
| **Primary tone**    | filled **blue** `#3E7BFA` at rest, white text      | orange accent (`--primary-main`), white bg at rest, fills on hover | conflict → decision #1    |
| **Ghost variant**   | text-only, **orange** `#F26532`, 8% tint on hover  | _no ghost variant_                                                 | gap → decision #1         |
| **Secondary tone**  | outlined: 1px `#E0E0E0`, charcoal text, hover→blue | white bg + blue label, fills blue on hover                         | conflict → decision #2    |
| **Danger variant**  | filled red `#e95c30`, hover `#c43c11`              | _no danger variant_                                                | gap → decision #2         |
| **Shape / radius**  | flat, `0.25rem` (4px)                              | pill, `--radius-button` (1.5rem / 24px)                            | conflict → decision #2    |
| **Rest elevation**  | none (flat)                                        | `--shadow-2` raised surface                                        | conflict → decision #2    |
| **Height / size**   | medium 36px, small 28px (`btn-sm`)                 | single fixed 40px (`--nav-item-height`), no size prop              | conflict → decision #3    |
| **Touch (≤1023px)** | non-small grows to 48px / 1rem font                | none (bump deliberately removed)                                   | conflict → decision #3    |
| **Min width**       | `4rem` (64px)                                      | `7.1875rem` (115px)                                                | conflict → decision #2/#3 |
| Padding (medium)    | `0.375rem 1rem`                                    | fixed height + `padding-inline: 1.25rem`                           | conflict → decision #2/#3 |
| **Focus ring**      | 3px blue glow, offset 2px                          | 2px solid `--primary-main` (orange), offset 2px                    | conflict → decision #4    |
| **Disabled**        | whole button `opacity: 0.38`, `not-allowed`        | label/icon → `--gray-light`, pill keeps surface + shadow           | conflict → decision #4    |

**Adopted in full and verified** by rendering the showcase (`#/showcase/buttons`) in light + dark, at desktop and ≤1023px.

**Danger tone (resolved 2026-07-21, Carl):** the `danger` variant is the brand orange (`--primary-main` → `--primary-dark` on hover), matching the standard's literal CSS (`#e95c30`/`#c43c11`). Per Carl it's a "be careful with this" accent, _not_ a hard destructive error-red — ghost (text) and danger (fill) share the brand tone but read differently by weight. (An earlier pass mapped danger to `--error-main` and added an `--error-dark` token; both reverted.)

**Deliberate deviations from the raw standard:**

- **Near-hues resolve to our tokens, not the standard's exact hexes** — ghost/danger orange `--primary-main` (#e95c30) vs `#F26532`; secondary edge `--input-border` (#e4e4e7) vs `#E0E0E0`; secondary text `--button-text` vs charcoal `#2F3D45`. Reconciling the exact palette belongs to a colour/Typography pass, not buttons.
- **Filled-hover elevation is a neutral `--shadow-2`**, where the standard uses a colour-tinted drop shadow — cosmetic.
- **Loading ≠ disabled-looking (Carl 2026-07-21):** a `loading` button stays `disabled` (click/key-blocked, `aria-busy`) but renders at full opacity with a progress cursor — busy, not dimmed. Disabled (non-loading) still dims to 38%.
- **Focus ring follows the variant tone (Carl 2026-07-21):** the standard shows a uniform blue focus ring, but a blue ring on an orange button reads as disconnected. So primary + secondary keep the blue ring (`--secondary-main`); ghost + danger take a brand-orange ring (`--primary-main`).

**Deferred follow-ups (recorded so they aren't lost):**

- **SplitButton + CheckboxButton still use the old shadowed-orange pill** — they now read as inconsistent beside the flat Button. Restyle in a dedicated pass (the standard has a `#btn-split` section).
- **App-wide focus treatment isn't unified** — the Button now uses a per-variant `outline` ring, while inputs/IconButton use the orange box-shadow `--focus-ring`. A focus pass could align the treatment (outline vs glow) and the per-variant colour logic across the library.
