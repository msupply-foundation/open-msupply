# Names (Customers & Suppliers) — UI migration report

**Scope:** the whole `names` vertical — both lists (S1 Customers, S2 Suppliers), the shared list screen and its filters, the S3 customer detail modal, the S4 supplier detail page and all four of its tabs, and the shared detail form. Run under [`migrate-ui`](../../../../.claude/skills/migrate-ui/SKILL.md) against the eleven dimensions of [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md).

**Status: MIGRATED.** Ten findings applied (nine from the audit plus one the reactivity pass caught), three spec edits made, `pnpm check` and `pnpm test` green. **The visual pass is yours to complete** — the list is at the end.

## What changed

| ID     | Change                                                                                                                                                                                                                               | Dims       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **R1** | The read-only detail form is rebuilt as the **sectioned form of read-only labelled values** — no disabled controls anywhere (D67); unset fields show a dash, flags read Yes/No                                                       | 1/4/5/9/11 |
| **R2** | `FilterBar` moved from the page `Header`'s `<Toolbar>` into the `DataTable`'s own `filters` slot; the header is now `Breadcrumb` only                                                                                                | 2/3/11     |
| **R3** | Pagination moved from a page `ContentFooter` to the table's own footer via the `pagination` prop (page sizes 10/20/50/100 preserved)                                                                                                 | 3          |
| **R4** | All three tables take their cell-type width presets — `getCellDefinition` where a `CELL_DEF` key exists, an explicit helper + call-site `size` where none does; the PO comment column is now the comment cell (icon + popover)       | 3          |
| **R5** | Both inline-`style` flex layouts gone: the code cell is an `HStack`, the address pair a `FormRow`                                                                                                                                    | 1/6        |
| **R6** | All three tables gained `configIsDefault` + the central-admin-gated `onSaveGlobalDefault`                                                                                                                                            | 3          |
| **R7** | The modal footer is the pre-composed, icon-less `OkButton` (D55); `dialog-button-ok` kept byte-identical                                                                                                                             | 1/5        |
| **R8** | The website link is `rel="noopener noreferrer"`                                                                                                                                                                                      | 9          |
| **R9** | Not-found states: the supplier page shows a return-to-list notice, the modal an `EmptyState`, and both the breadcrumb leaf and the dialog's accessible name say "not found" instead of "Loading…" forever                            | 2          |
| **RX** | **Found by the reactivity pass, not the audit:** the customer modal read its resource with `.latest` alone, which suspends until the resource first resolves — so opening the modal could tear down the open `<dialog>` and the list | 7          |

## Coverage — greened

Rows = every screen/piece in scope; columns = the eleven dimensions.

| Screen / piece                             | 1 Registry | 2 Composition | 3 Tables       | 4 Inputs | 5 Detail/panel | 6 Styling | 7 Reactivity | 8 Types | 9 A11y   | 10 Test hooks | 11 Spec |
| ------------------------------------------ | ---------- | ------------- | -------------- | -------- | -------------- | --------- | ------------ | ------- | -------- | ------------- | ------- |
| `index.tsx` (routes)                       | ✅         | ✅            | —              | —        | —              | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S1 `list/CustomersList.tsx`                | ✅         | ✅            | —              | —        | —              | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S2 `list/SuppliersList.tsx`                | ✅         | ✅            | —              | —        | —              | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| Shared list `list/NamesList.tsx`           | ✅ R5      | ✅ R2         | ✅ R2·R3·R4·R6 | ✅       | ✅             | ✅ R5     | ✅           | ✅      | ✅       | ✅            | ✅ R2   |
| `list/listFilters.tsx`                     | ✅         | —             | ✅             | ✅       | —              | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S3 `detail/CustomerDetailModal.tsx`        | ✅ R7      | ✅ R9         | —              | ✅       | ✅ R7          | ✅        | ✅ RX        | ✅      | ✅       | ✅            | ✅      |
| S4 `detail/SupplierDetailPage.tsx`         | ✅         | ✅ R9         | —              | —        | ✅             | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S4 Details `detail/SupplierDetailsTab.tsx` | ✅         | ✅            | —              | ✅       | ✅             | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| Shared form `detail/NameDetailForm.tsx`    | ✅ R1·R5   | ✅            | —              | ✅ R1    | ✅ R1          | ✅ R5     | ✅           | ✅      | ✅ R1·R8 | ✅            | ✅ R1   |
| S4 Custom fields (`domain/customFields`)   | ✅         | ✅            | —              | ✅       | ✅             | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S4 `detail/PurchaseOrdersTab.tsx`          | ✅         | ✅            | ✅ R4·R6       | —        | ✅             | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |
| S4 `detail/ContactsTab.tsx`                | ✅         | ✅            | ✅ R4·R6       | —        | ✅             | ✅        | ✅           | ✅      | ✅       | ✅            | ✅      |

## The findings in detail

### R1 — The read-only detail form rendered every field as a disabled control · **applied**

- **Rule:** [`detail-views.md` § Never-editable fields are never disabled controls](../../../spec/ui-standards/detail-views.md#never-editable-fields-are-never-disabled-controls) + [D67](../../../spec/DIVERGENCES.md) (decided 2026-07-27, generalised app-wide 2026-07-29). `spec/names/ui-surface.md:56` already said the same.
- **Was:** `NameDetailForm` composed 19 `DetailRow`s, and `DetailRow` renders a `value` in a `disabled readOnly TextField` and a `checked` in a `disabled` checkbox. So every field was a greyed-out box, the three flags were disabled checkboxes (which cannot tell `false` from _never set_), and empty fields rendered as empty boxes rather than dashes. The [items migration](../items/ui-migration-report.md) had logged this as a names follow-up; the Custom fields tab on the same page already conformed, so two tabs of one record contradicted each other.
- **Now:** `ContentContainer size="form"` → `Stack gap="lg"` → `RecordNameHeader` → `FormColumns`/`FormColumn` (each a `Stack gap="md"` of `LabelledValue variant="field"`) → a full-width `Stack gap="md"` for address / country / website / supply level. Field order and the AC-N25 trade-term interleave are unchanged; the address pair is a `FormRow`; unset → `EMPTY_FIELD_VALUE` (a dash); flags → `t('messages.yes')`/`t('messages.no')`.
- **Decisions taken:** `RecordNameHeader` is kept over `IdentityHeader` because `ui-surface` names the record-name-header role and it carries the store indicator, which `IdentityHeader` has no slot for. The groups stay untitled (the spec gives this form no headings), so each column stacks fields directly rather than through `FormSection`, which requires a title — the same shape as `CustomFieldsView`.
- **`padded`:** the page host passes it (its `Page` is `fillBody` for the table tabs, so the body has no edge padding); the modal host doesn't (the dialog body already pads).
- **Shared:** `EMPTY_FIELD_VALUE` is now exported from `domain/customFields/index.ts` — it is the app-wide empty marker for a read-only field, so the Details tab and the Custom fields tab render an unset field identically.
- **Reference copied:** `items/detail/ItemDetailView.tsx` (General/Store tabs) and `domain/customFields/CustomFieldsView.tsx`.
- **Measure (operator's call, 2026-07-30):** the form sits in the **narrow** measure (`size="prose"`, 40rem), not the two-column-form one (58rem). At 58rem each column is ~424px against ~150px of ink, so the two clumps sat 456px apart and read as left-hugging under the centred record-name header. At 40rem the columns are ~280px — fields still left-aligned in their column, block reads centred. `FormColumn minWidth="15rem"` comes with it: `minWidth` is both the wrap threshold and the shared flex basis, so the 22rem default would wrap two columns into one stack at this measure. **Follow-up option (library, unfiled):** a named narrow-form measure (`size` value + token) would say this in the API instead of borrowing `prose`; alternatively `FormColumns` could gain a "cap the columns and centre the row" mode, which would centre the pair without narrowing the full-width group below it.

### R2 — The filter bar rendered in the page header · **applied**

[`tables.md:15`](../../../spec/ui-standards/tables.md) is binding and "overrides any vertical spec that places filters elsewhere". The `FilterBar` (with its `extra` custom-field group untouched) now sits in the `DataTable`'s `filters` prop; the `Toolbar` import and element are gone and the header is `Breadcrumb` only. The seeded-present search chip is unchanged, so `filter-input-codeOrName` still needs no menu step — `FilterBar` emits it wherever it is mounted, so `specs/names-regression.spec.ts` is unaffected.

### R3 — Pagination was a page footer band · **applied**

[`kdd/table-state`](../../../kdd/table-state/draft-kdd.md) (2026-07-23): the `DataTable` renders one footer bar and the page passes state through `pagination`. The `ContentFooter` + `Pagination` slot is replaced by the prop, carrying `pageSizes: [...PAGE_SIZE_OPTIONS]` so AC-N12's 10/20/50/100 set survives. There is no selection bar to swap with (read-only, AC-N16).

### R4 — Column widths and cell types · **applied**

Per [`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md), following the locations and items rollouts:

| Table           | Column                                   | Now                                                                                                                      |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| List            | `code`                                   | `getCellDefinition('code', { headerPosition: 'primary' })`, preset spread **before** the store-indicator `cell` override |
| List            | `name`                                   | `getCellDefinition('name', { wrapLines: 2 })`                                                                            |
| Contacts        | `firstName`/`lastName`/`email`/`phone`   | `getCellDefinition` (short-text preset)                                                                                  |
| Contacts        | `position`/`category1`                   | `getTextCell()` + `size: remToPx(10)` (no `CELL_DEF` key)                                                                |
| Purchase orders | `createdDatetime`/`confirmedDatetime`    | `getCellDefinition` (date preset)                                                                                        |
| Purchase orders | `comment`                                | `getCellDefinition('comment')` — icon + popover, the house treatment                                                     |
| Purchase orders | `number`/`targetMonths`/`lines`/`status` | explicit helper + call-site `size` (no `CELL_DEF` key; status chip preset not built)                                     |

### R5–R8 · **applied**

- **R5** — the code cell is `<HStack gap="sm">`; the three address `<div style>`s are gone (R1's `FormRow`). No inline `style` remains anywhere in the vertical.
- **R6** — `configIsDefault={tableConfig.isConfigDefault()}` + `onSaveGlobalDefault` gated on `tableConfig.canSaveGlobalDefault()` on all three tables.
- **R7** — `<OkButton onClick={props.onClose} data-testid="dialog-button-ok" />`; the `CheckIcon` import dropped. D55 forbids the icon; `detail-views.md:65` keeps **OK** as the label for a read-only viewer's dismiss, so only the icon and the hand-rolled `Button` changed.
- **R8** — `rel="noopener noreferrer"`, matching the help vertical.

### R9 — No not-found state · **applied**

Both hosts spun forever on an id that resolves to no record. Now: spinner while `data.loading`, then a notice. The page uses the items pattern (`ConfirmDialog` whose confirm and dismiss both return to the supplier list) but keeps it **inside** the `Page` body, so the breadcrumb and tab strip stay as `detail-views` § States requires; the modal shows an `EmptyState` in its body (no nested dialog). The breadcrumb leaf (the page `<h1>`) and the dialog's accessible name now read the not-found title rather than "Loading…". Two new locale keys in `en/` only: `error.supplier-not-found`, `messages.click-to-return-to-suppliers`, plus `error.customer-not-found` / `messages.customer-not-found`.

### RX — The customer modal suspended on its first open · **applied** (audit miss)

- **Rule:** the root `CLAUDE.md` anti-default and [`kdd/solid-reactivity-pitfalls` › no remounts on interaction](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md#no-remounts-on-interaction) — a resource that first fetches on an **interaction** must be read non-suspending, and **`.latest` alone is not safe**.
- **Problem:** `detail()` read `data.latest?.detail`. Solid's `latest` getter falls back to the suspending read while `!resolved` (confirmed in `solid-js/dist/solid.cjs:398`), so the **first** open of the modal reads a pending resource and suspends the boundary above — tearing down the just-opened native `<dialog>` (losing its modal backdrop) and the list behind it. Its two siblings (`ContactsTab`, `PurchaseOrdersTab`) already used the `.state` gate; the modal didn't.
- **Fix:** a `loaded()` accessor gating on `data.state === 'ready' || 'refreshing'`, used for both `detail` and `propDefs`. `data.loading` stays the spinner boolean.
- **Audit miss, honestly:** I read this resource during the audit and marked dimension 7 clean because the read "looked like the sanctioned first-load case". It isn't — the screen is already open. The reactivity pass on the diff is what caught it, which is exactly why it runs after the fixes as well as before.
- **Not a finding:** the list's and the supplier page's own `.latest` reads are each a screen's own first load with no live user state to lose — the sanctioned case, and unchanged.

## Spec reconciliation

All three conflicts were **pure-UI**, so the standards won and the spec moved. No behaviour/content/gating conflict was found: field sets, column sets, tab order, sort default, page sizes, store scoping, read-only-ness and the row-open behaviours all matched `rules.md`/`acceptance.md` as implemented.

- **SE1 · `spec/names/ui-surface.md` (S1 Layout)** — the "**Toolbar:** a search field … plus the add-a-filter menu" bullet placed filters in a page toolbar, which `tables.md:15` overrides. It now states the filter **set** only and defers placement to the table standard; the pagination bullet likewise no longer asserts a page footer.
- **SE2 · `spec/names/ui-surface.md` (S3 Layout, S4 Details tab)** — [`detail-views.md:41`](../../../spec/ui-standards/detail-views.md) requires a fully read-only vertical to **state which** read-only presentation it uses. Both now name the sectioned form of read-only labelled values, with the two column groups, their wrap order, and the paired address row. `:56`'s "plain text, Yes/No, dash" sentence already matched the fix and stands.
- **SE3 · `spec/ui-standards/components.md` § Detail views** — the scaffold row pointed at `src/sections/names` as the live shape of the **inline-label** form, which R1 made false. It now describes both presentations, points the inline-label one at the showcase and the label-above one at names + items, and records the fact behind library finding L2: the inline-label form has no conforming consumer, because `DetailRow`'s `value`/`checked` render as disabled controls that D67 forbids. **No DIVERGENCES entry needed** — D67 already covers this app-wide.

## Boutique / uncovered elements

**None.** Every element in scope is covered by a built (✅) library component, including the store-indicator cell (`HStack` + `HomeIcon`), the paired address (`FormRow`), and the website link (a composed anchor — the registry's 🔶 by-composition external-link role). The two ⛔ roles the vertical touches keep their documented substitutions: the dedicated **free-text search field** (⛔ → a seeded `FilterBar` text chip, as the items migration also adopted) and the **status-chip cell preset** (⛔ → a text column at the width that preset reserves).

## Library findings — flagged, not fixed

The migration does not change shared library code. Each of these needs its own signed-off task:

- **L1 · `FilterBar` has no always-on / non-removable chip.** The names lists seed `filter: { codeOrName: null }` so the search chip is present on arrival with no menu step — what [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md) promises — but the user can still remove it, after which the "always-present" search is gone until re-added through the menu. Already recorded as **L3 in the items report**; names is the third vertical hitting it.
- **L2 · The `Detail` family contradicts D67 and now has no consumer.** After R1, `DetailContainer` / `DetailGrid` / `DetailRow` are demoed only by `DetailViewsShowcase`; `RecordNameHeader` keeps this vertical and `DetailCard` keeps items. Decide: fix them to the D67 treatment (plain text / Yes-No), or retire them with their registry rows and showcase page. `DetailGrid` also has no registry row at all. Recorded in the registry by SE3.
- **L3 · No external-link glyph in `src/ui/icons`.** The registry's External-link role asks for a visible leaves-the-app indication; the set has none and the built precedent (help) renders none. Either add the glyph or soften the registry note.
- **L4 · `CELL_DEF` has no key for a purchase-order number, `position`, `category1`, or a status chip.** Handled with call-site widths per `CELL_TYPES.md`, so this is a width-rollout gap: candidate keys for `_globalColumnConfig.ts` when that rollout continues.

## Verification

- `pnpm check` — **green** (exit 0: CSS-module types, `tsc -b`, stylelint, theme contract 65 tokens, page-CSS guard, browser floor).
- `pnpm test` — **green**, 96 files / 886 tests.
- `check-reactivity` on the working diff — one REAL finding (RX, fixed above); re-reviewed after the fix. The `filters={<FilterBar …/>}` JSX prop is resolved once by `DataTable`'s `children()`, and the `pagination` object is spread live by design (`DataTable.tsx:1197-1203`), so both stay reactive.
- No inline `style`, colour literal, px, or CSS module anywhere in the vertical; no test id changed.

## Changes the visual pass produced (signed off, applied)

Two operator calls came out of eyeballing the migrated detail form. Both reach beyond names, so they are recorded here and in their own homes rather than buried in the vertical.

- **The form's measure** — see R1 › Measure above (`size="prose"` + `minWidth="15rem"`). Names-local.
- **Field labels are semibold app-wide** (Carl, 2026-07-30). `--field-label-font-weight`: `--weight-medium` (500) → **`--weight-semibold`** (600). Prompted by this form: a read-only labelled value's label sat one weight step above its own value, same size and colour, with no input box to mark it as a label. Because the shared token is the point of D67 parity, raising it fixes read-only and editable together. **Four labels had inlined the same values and would have been left behind at 500**, so they now reference the token: `Select` / `Combobox` / `MultiSelect` (full `--field-label-*` set — their comments already claimed parity with `TextField`), plus the weight alone on `Checkbox`, `ToggleSwitch`, the `RadioGroup` legend and the inline `FieldRow`. Deliberately unchanged: an individual radio option's text (body text — the legend is the group's label), a `CheckboxButton` pill, and `FilterBar` trigger/chip text (chip chrome). This supersedes the 2026-07-22 "choice controls are a different pattern" note **for weight only** — they still own their size and colour. Recorded in [`DESIGN_STANDARDS.md`](../../ui/docs/DESIGN_STANDARDS.md) and [`conventions.md`](../../../spec/ui-standards/conventions.md) (which stated "medium-weight" and now states semibold).
  - **Verified computed** on the running app (:3008, `admin`): the supplier Details tab's labels 14px/**600** over 14px/400 values; `TextField`/`TextArea`/`DateField` 14px/600 (small variant 13px/600); `Select`/`Combobox`/`MultiSelect` 14px/600; `Checkbox`, `ToggleSwitch`, `RadioGroup` legend, `FieldRow` all 14px/600.

## The visual pass — yours to complete

Static checks cannot catch "compiles clean but looks wrong". Open each screen in **light and dark**:

| Screen                | Route                                   | Compare against                                                             |
| --------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| Customer list         | `/{storeId}/distribution/customers`     | `#/showcase/table`; the stocktakes list (`/{storeId}/inventory/stocktakes`) |
| Supplier list         | `/{storeId}/replenishment/suppliers`    | same                                                                        |
| Customer detail modal | a Customer row                          | `#/showcase/forms`, `#/showcase/form-layout`                                |
| Supplier Details tab  | a Supplier row                          | the items detail General tab (`/{storeId}/catalogue/items/{id}`)            |
| Custom fields tab     | `?tab=custom-fields`                    | the Details tab beside it — they should now read alike                      |
| PO / Contacts tabs    | `?tab=purchase-orders`, `?tab=contacts` | `#/showcase/table`; `#/showcase/detail-views` § tabs                        |

Worth looking at specifically, since these are what changed:

1. **Column widths + resizing** — every table now takes width presets. `code` is capped at 7rem (drag it); the PO number/target-months/lines/status widths are first-cut call-site values, tune them at the call site if they read wrong.
2. **The PO comment column** is now an icon + popover rather than text — check it reads as intended in that table.
3. **Field rhythm in the detail form** — labels are now **above** values, the two column groups wrap to one stack when squeezed (narrow the window: left column first), and the address pair should sit two-up then stack.
   - The form is at the **40rem** measure with `minWidth="15rem"` columns (see R1 › Measure). Worth checking both hosts: on the supplier page the block should read centred under the record name; in the customer modal (52rem `widthRem`) it now leaves ~4rem of dialog either side — if that reads as too inset, narrowing the dialog to ~46rem is the one-line follow-up.
4. **The dash** on empty fields, and Yes/No on manufacturer / donor / on hold.
5. **Filter chips** — the search chip should be there on arrival with no menu step, shrink-to-content, in the table's toolbar rather than the app bar.
6. **Pagination** now sits in the table's own footer bar, not a page band.
7. **The modal footer** — one icon-less OK, and the modal should not flicker or lose its backdrop when it opens (that was RX).
8. **Not-found** — open `…/replenishment/suppliers/nonsense` and a customer modal for a deleted id.
