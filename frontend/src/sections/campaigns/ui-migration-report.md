# Campaigns — UI migration report

> `migrate-ui` run over the whole vertical (2026-08-18). Scope: `src/sections/campaigns/` — the register list (S1), the create/edit dialog (S2), and the delete confirmation (S3), plus the pure logic modules. **Status: complete — F1–F3 fixed + one spec edit, F4 withdrawn (spec-owned value), `pnpm check` + `pnpm test` green (174 files / 1714 tests), check-reactivity clean before AND after the fixes. Operator visual pass outstanding.**

## Coverage (post-fix)

Rows = screens, columns = the eleven dimensions of [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md). `—` = not applicable (no such surface).

| Screen                                               | 1 Registry | 2 Composition | 3 Tables | 4 Inputs | 5 Forms/dialogs | 6 Styling | 7 Reactivity | 8 Types | 9 A11y | 10 Test hooks | 11 Spec |
| ---------------------------------------------------- | ---------- | ------------- | -------- | -------- | --------------- | --------- | ------------ | ------- | ------ | ------------- | ------- |
| S1 register list (`CampaignsList.tsx`)               | ✅         | ✅            | ✅       | ✅       | ✅              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| S2 editor dialog (`CampaignEditModal.tsx`)           | ✅         | ✅            | —        | ✅       | ✅              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| S3 delete confirmation (`DeleteCampaignsAction.tsx`) | ✅         | ✅            | —        | ✅       | ✅              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |

What was already right (not churned): no inline `style`, no section CSS module, every role filled by its registered component (Page/Header/Breadcrumb/HeaderButtons, DataTable + `selectionActions` — the current house selection bar, as in inbound-shipments/requisitions/internal-orders — Dialog/Alert/Stack/FieldRow/TextField/DateField/StandardButtons), the spec'd deviations (no filter bar, no export, unsortable dates) all correctly expressed, `.state`-gated resource reads throughout, draft = generated `UpsertCampaignInput` (no remapping), all test-ids conform to `e2e/TESTIDS.md`, all locale keys resolve. The absence of `initialFocus` on the editor is **correct** — the Dialog contract reserves it for single-capture dialogs; a several-field form keeps the panel default.

## Findings and outcomes

### F1 — Date columns had no width preset — **fixed**

`CampaignsList.tsx` called the bare `getDateCell()` for Start/End date, which sets rendering but no `size`, so the columns rendered at TanStack's default width and could not be drag-resized ([`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md) § width model). With operator sign-off, `startDate: { kind: 'date' }` and `endDate: { kind: 'date' }` were added to `CELL_DEF` ([`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts)) — argument-free generic date keys, exactly what the shared map exists for — and the columns now use `...getCellDefinition('startDate')` / `('endDate')`.

### F2 — `DetailContainer` inside the editor Dialog — **fixed + spec edit**

`DetailContainer` is the page-level detail-form frame (centres, caps at 44rem, adds its own padding + gap); inside a `width="prose"` Dialog it double-padded and re-capped content the frame already measures. Removed; the `Stack` of `FieldRow`s now sits directly under the Dialog, matching the sites editor and `CustomTranslationsModal` (no sibling puts `DetailContainer` in a Dialog — the Dialog's `width` measure owns the cap). **Spec edit (signed off):** `spec/campaigns/ui-surface.md` S2 § Layout now reads "at the single-column form measure" instead of "in a detail container" — pure-UI, standards win.

### F3 — Error-phase footer button was `CancelButton` — **fixed**

In the could-not-delete phase nothing is being cancelled; the house pattern (internal-orders + inbound-shipments agree) is a single `<Button variant="secondary" confirms="plain">` labelled **Close** (`button.close`), which also gives Enter-to-dismiss. `DeleteCampaignsAction.tsx`'s error phase now matches; the same `close()` path still fires `onRejectionDismissed`, so behaviour is unchanged.

### F4 — Hard-coded default page size — **withdrawn, no change needed**

The audit proposed importing `DEFAULT_PAGE_SIZE`; the register's own test (behaviour `.6`) immediately caught that the app-wide default is **50** while the campaigns register's spec'd default is **20** — a spec-owned content value, deliberately distinct, so the spec wins and the literal stays. The constant's comment now states the distinction explicitly so the next reader doesn't re-derive the same wrong fix.

## Boutique / uncovered elements

None. Every role resolves to a built or by-composition registry component; no ⛔ roles are in play (BUILD_REPORT concurs).

## Library / registry follow-ups (flagged, not fixed here)

- **`ConfirmDialog` cannot hold the D22 error phase** (it confirms-and-closes in one call), so campaigns — like stocktakes, internal-orders, inbound-shipments and sites before it — composes its confirmation on `Dialog`. BUILD_REPORT already flags "worth a registry note if a third vertical repeats it"; campaigns is well past the third. → registry note under Menus/popovers & modals, or an `ADDING_A_COMPONENT.md` task for an error-phase-capable confirm.
- **Stocktakes (the reference) itself drifts** on two of the patterns judged here: bare `getDateCell()` on `createdDatetime` (the new `startDate`/`endDate` CELL_DEF keys don't cover it — `createdDatetime` already has one it doesn't use), and `CancelButton` in its delete error phase. Belongs to a stocktakes pass, not this one.
- **`spec/sites/ui-surface.md:119`** carries the same "in a detail container" phrase F2 removed here, with the same already-diverged implementation (recorded in `SiteEditModal.tsx`'s ⚠️ comment). Same one-line spec fix belongs there.

## Verification

- `pnpm check` — green (types, stylelint, theme contract, page-CSS guard, reduced motion, browser floor).
- `pnpm test` — green: 174 files / 1714 tests (including the campaigns register/editor/delete suites).
- check-reactivity — 0 real findings on the pre-fix vertical AND on the fix diff.
- **Operator visual pass — outstanding.** Open `/{storeId}/manage/campaigns` in light and dark and compare against `#/showcase/table`, `#/showcase/header`, and the stocktakes list. Look specifically at: the two date columns' width and drag-resize (F1), the editor dialog's body padding/width (F2 — should match the sites editor's rhythm), the delete-rejection notice's single Close button (F3), empty state, and the selection bar swap.
