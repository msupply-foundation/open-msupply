# Code Review — PR #351: Outbound Shipments (spec + reference implementation)

## Overview

Adds the Outbound Shipments vertical: an executable spec (`spec/outbound-shipments/`, `spec/stock-allocation/`) plus a SolidJS reference implementation (list, detail, line-editor/allocation surface, service charges, status lifecycle, store-preference wiring), some shared UI/infra changes (Combobox `clearable`, DataTable row tone/dimming, an expiry-date cell helper, NameSearch props), and locale strings. 55 files, ~7.6k additions. Verified green per the PR body (`pnpm check`/`test`/`build`, 147 tests).

**Overall quality is high.** It closely follows the reference vertical (stocktakes), the state-management/type-safety/explicit-composition KDDs, and — notably — the SolidJS reactivity rules: `.latest`/`noSuspense()` reads to avoid Suspense collapsing open modals, `createMemo(() => [...draft])` to track array shape without tearing down the batch grid, mount-while-open `<Show>` wrappers, `onCleanup` for timers, no prop destructuring, and generated-type derivation (`Extract`/`NonNullable`) with no parallel remapping. No blockers, no data-corruption bugs.

The most actionable theme is a small family of **controlled-input desync bugs**, plus a few error-surfacing and spec-parity misses.

## Findings

### Worth fixing before merge

**1. Controlled numeric fields desync on clamp/reject (reactivity KDD §13) — two instances.** When a typed value is clamped/rejected back to the _same_ stored value, the signal doesn't change, so Solid never rewrites the DOM and the illegal text stays on screen (the saved value is correct — this is a display-integrity bug, not data loss):

- `src/sections/outbound-shipments/detail/edit-modal/OutboundLineEditModal.tsx:4489` — the per-batch "packs issued" cell is a plain `TextField type="number"` whose `onInput` clamps via `Math.max(0, Math.min(v, availablePacks))` with `value={line.numberOfPacks || ''}`. Enter `105` into a 10-max batch → clamps to 10 → field keeps showing `105`. The repo's `NumberField` exists precisely to repair the DOM here.
- `src/sections/outbound-shipments/detail/OutboundSidePanel.tsx:2911` — the items-tax field skips the save when out of range; type `150`, blur, and `150` stays visible while nothing is stored.

**2. Server error dropped from the service-charges save failure** — `src/sections/outbound-shipments/detail/service-charges/ServiceChargesModal.tsx:6204` calls `t('outbound.edit.save-failed', { error: '' })` with an empty interpolation even though the failing responses carry `error.description`. User sees a generic message with a blank reason.

**3. Stale state across reopens of the customer-search modal** — `src/sections/outbound-shipments/list/CustomerSearchModal.tsx:6611` is mounted persistently and only toggles the native `<dialog>` (unlike `ServiceChargesModal`, which gates content behind `<Show when={props.open}>`). `error()` is cleared only inside `create()`, so: open → create fails (red Alert) → cancel → reopen shows the stale error. Wrap in `<Show when={props.open}>` (matching the other modals) or reset on open.

**4. Batch-grid Expiry column doesn't use the near-expiry reddening** — `src/sections/outbound-shipments/detail/edit-modal/OutboundLineEditModal.tsx:4413` uses plain `getDateCell()`, but the PR _adds_ `getExpiryDateCell` (and uses it in the detail line table at line 2238), and spec S4's batch-grid column list explicitly specifies `getExpiryDateCell` here. Spec/impl deviation.

### Minor / worth a conscious decision

- **Shared Combobox behaviour change** — `src/ui/elements/selectors/Combobox.tsx` now also hides the clear button when `disabled`. This is arguably correct, but it touches four existing disabled-capable selectors (Location/Reason/ShippingMethod/MasterList), so it deserves an explicit sign-off rather than riding in as an outbound tweak. (The `clearable ?? true` default is backward-safe — verified.)
- **`outboundStatus` test gaps** — `src/sections/outbound-shipments/outboundStatus.test.ts` never asserts `isEditable('RECEIVED')` (only DELIVERED/VERIFIED), nor the `statusLabel`/`statusColour` `??` fallbacks or CANCELLED. This is the gate every edit affordance keys off — worth full coverage.
- **`as` casts in component code** (type-safety KDD wants these confined to trusted layers): allocate-in lens `(allocateIn() as { size: number })` at `OutboundLineEditModal.tsx:4666` (narrow on `.kind` instead); conditional-column `as Column<…, never>` literals in `OutboundDetailView` (2247/2273/2317); store-setter `as never` in `ServiceChargesModal.tsx:6127` (the known Solid limitation — lowest priority).
- **Partial-failure staleness** in the bulk loops — `AllocateLinesAction` (~3403) and `DeleteShipmentsAction` (~7179) bail on the first non-success without a refetch, so if line 3 of 5 fails after 1–2 committed server-side, the grid/list stays stale (`onCommitted`/`onDeleted` never fires). _needs-verify:_ moot if the batch resolvers are atomic.
- **Expected-delivery field** — `src/sections/outbound-shipments/detail/OutboundSidePanel.tsx:2999` is a raw controlled `type="date"` saving on every `onInput` (redundant `updateOutboundShipment` calls; segment-loss risk per the KDD appendix). Matches the stocktakes precedent, but `DateInput` is the documented fix and the other text fields correctly route through the debounced buffer.
- **"Available: N units" counts barred stock** (`OutboundLineEditModal.tsx:4214`) — sums all batches including on-hold/expired/VVM-unusable that won't allocate. _needs-verify:_ consistent with the shared `units.ts` helper, may be intended old-app parity.

### Nits

- Translation key `outbound.edit.warn-on-hold` is misleadingly narrow — the message text is generic and correct ("Unusable batches (on hold, expired or unusable VVM status) were skipped"), so **not a bug**, but a rename would prevent exactly the misread that surfaced in review.
- Missing `data-testid` on the header "More" (reopen side panel) button, whose siblings have them and whose behaviour the shared e2e suites drive (`OutboundDetailView.tsx:2418`).
- CSV export writes raw ISO date / raw number rather than the list's display formatting (`shipmentsToCsv.ts`); timezone-naive `T23:59:59` "to" bounds in `listFilters.tsx` (uniform, low impact).
- A few local re-implementations of `src/domain/allocation/units.ts` helpers (`availableUnits`/`issuedUnits`/`distinctPackSizes`/`isBarred`) in the modal.

## Verified solid (checked, not defects)

Allocation arithmetic (whole-pack FEFO, over-allocation vs shortfall mutually exclusive, placeholder gated to `isNew`, `distribute(0)` zeroes correctly); `outboundUpdate.ts` error-handling split mirrors `stocktakeUpdate` with clean discriminated results; the batch grid and service-charges `<For>` don't remount on cell edits (focus preserved); `date-fns` adds no bundle cost (tree-shaken from an existing dep); preference resource matches the state-management KDD; route/nav wiring matches the reference; re-entry guards present on the confirm-dialog actions.

**Recommendation:** Address the group-1 items (especially the two controlled-input desyncs and the dropped service-charge error), get a sign-off on the shared Combobox change, then merge. Also worth heeding the PR's own note that `main` has advanced ~56 commits — rebase/merge before landing.

---

## Note on line numbers

Line numbers refer to the files as they appear on the PR branch `outbound-shipments-spec-and-reference-impl`. The review was produced from the PR's unified diff (`gh pr diff 351`), not a local checkout — a couple of the shared-file references (Combobox, DeleteShipmentsAction, AllocateLinesAction) cite approximate lines. Check out the branch to resolve exact positions.
