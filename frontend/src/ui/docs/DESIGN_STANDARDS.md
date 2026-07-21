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

| Standard section  | Status      | Last synced | Notes                                          |
| ----------------- | ----------- | ----------- | ---------------------------------------------- |
| Typography        | Not started | —           |                                                |
| Tables            | Not started | —           |                                                |
| Input Fields      | Not started | —           |                                                |
| Buttons           | Not started | —           | First candidate for a demo reconciliation pass |
| Search            | Not started | —           |                                                |
| Modals & Drawers  | Not started | —           |                                                |
| Navigation        | Not started | —           |                                                |
| Tabs              | Not started | —           |                                                |
| Errors & Feedback | Not started | —           |                                                |
| Accessibility     | Not started | —           |                                                |

Status values: **Not started** → **In review** (report produced, awaiting decisions) → **Reconciled** (implemented + verified).

## Open decisions (awaiting Carl)

Brand/UX conflicts that need a human ruling before implementation. Each is resolved in place (don't delete — record the decision) so the reasoning survives.

| #   | Section | Question                                                                                                                                                                                                                                                                   | Status |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Buttons | The standard appears to describe the **primary** button as a blue contained fill, but in our tokens primary is orange (`--primary-main`) and blue is `--secondary`. Is the primary action button becoming blue? _(To confirm against raw source during the Buttons pass.)_ | Open   |

## Ledger

One subsection per reconciled standards section. Fill it as step 7 of the loop. Format per section:

- A short prose note on scope + any deviations we chose (with the reason).
- A property table:

| Property | Standard value | Our token | Status | Notes |
| -------- | -------------- | --------- | ------ | ----- |

Status per row: `match` / `conflict → resolved (see decision #N)` / `gap → added token` / `gap → deferred`.

_No sections reconciled yet._
