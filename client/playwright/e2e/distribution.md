# Test: Distribution

Source: https://github.com/msupply-foundation/open-msupply/wiki/Test:-Distribution

---

# Automated test coverage

The Playwright spec at [`client/playwright/e2e/distribution-regression.spec.ts`](client/playwright/e2e/distribution-regression.spec.ts) covers part of this regression script. Current state and handover notes below.

## Tested ✅

**Outbound Shipments — list view**

- Renders core controls (New Shipment, Status header, rows-per-page)
- Search by Name filters results
- Filter by Invoice number
- Filter by Reference
- Export to CSV downloads
- Pagination next-page navigation
- Delete a New shipment (single row)
- Multi-select master checkbox deletes multiple
- Shipped shipments can't be deleted (rejection toast)

**Outbound Shipments — detail view**

- Sidebar panels render expected fields (Additional info, Related docs, Invoice details, Transport details)
- Comment edit persists
- Customer reference persists
- Transport reference persists
- Hold checkbox toggles on
- Log tab loads
- Close button returns to list

**Outbound Shipments — status flow**

- Happy path: create → Allocated → Picked → Shipped
- Hold on Picked prevents advancing to Shipped
- Hold on Allocated prevents advancing to Picked
- Un-hold allows status to advance again
- Skip statuses via split-button (New → Shipped directly)
- Status hover history popover

## Not tested ❌

**Outbound Shipments**

- Other filter types (Status, Created date, Shipped date)
- Pagination: page-number clicks, last/first page buttons
- Line edits (add via master list, edit existing line, delete line)
- Pack-size dropdown, manual per-batch allocation
- Placeholder lines + bulk allocate placeholders
- OK & Next button
- Type-to-filter on item/customer autocompletes
- Edit service charges modal
- Colour picker
- View modes (Group by item, hide columns)
- Shipped: lines locked (can't edit)
- Barcode scanner, print PDFs, DELIVERED/VERIFIED (need external setup)

**Other sections — not started**

- Requisitions
- Customer Returns
- Customers

---

# Handover notes

## How to run

- All tests: `cd client && BASE_URL=http://localhost:3005 yarn e2e distribution-regression --headed --workers 1`
- Filter to one: `-g "search by customer"` (case-insensitive substring match on test name)
- Faster: drop `--headed` for headless (no visible browser)
- HTML report after a run: `npx playwright show-report playwright/playwright-report`

## Helpers worth knowing

- `createNewShipment(page)` — new shipment via UI, returns URL
- `addLineToShipment(page)` — Add Item with first stocked item, qty 2, includes the OK-button retry pattern (the dialog needs 2-3 OK clicks because of a React state race)
- `pickItemWithStock(page, dialog)` — walks the item autocomplete looking for one with `Available: N > 0`. Dismisses popups after picking.
- `clickConfirmAndWait(page, regex)` — clicks a footer Confirm button, handles the optional "Are you sure?" confirmation dialog, waits for network settle. Includes `page.mouse.move(0, 0)` to dismiss the status-history hover popover that otherwise blocks clicks.

## Patterns / gotchas that took real time to discover

1. **`.MuiDialog-root` is unreliable** — matches multiple things (autocomplete popups, drawers, the actual dialog). Always use `getByRole('dialog', { name })` or filter by visible text.
2. **OK-button race in the Add Item dialog** — first click often gets swallowed mid-render. Always retry with `hover()` + `click()` in a loop until the dialog hides.
3. **MUI menu items use role `menuitem`, not `option`** — even when they're inside a listbox.
4. **Debounced text inputs** — Comment, Customer Ref, Transport Ref save via debounced GraphQL mutations. Don't reload immediately; wait for the actual mutation: `page.waitForRequest(req => req.postData()?.includes('updateOutboundShipment'))`.
5. **Hold short-circuit** — clicking a Confirm button on a held shipment shows the polite "Cannot change status because on hold" info toast and skips the confirmation dialog entirely. Source: `StatusChangeButton.tsx`'s `onStatusClick`.
6. **Status-history popover** — hovering the status sequence in the footer shows a popover that overlays the Confirm buttons. `page.mouse.move(0, 0)` before clicking Confirm dismisses it.
7. **Network-idle is too weak for debounced filters** — the request hasn't fired yet. Wait for the actual GraphQL request with text matching the search term.
8. **Column indices in the list table** (default order): 0 checkbox, 1 Name, 2 Status, 3 Number, 4 Created, 5 Reference, 6 Comment, 7 Total. **Columns are reorderable in the UI**, so anyone reordering them in their browser session breaks tests.
9. **Testids available** — prefer these over `.MuiDialog-root` / label-text traversal:
   - `detail-panel` — sidebar drawer
   - `confirmation-modal` + `confirmation-modal-ok` — "Are you sure?" and "Confirm status as X" dialogs
   - `customer-search-modal` — New Shipment customer picker
   - `add-item-modal` — Add Item dialog
   - `dialog-button-{variant}` — every `DialogButton` (ok, cancel, save, delete, …)
   - `comment-field`, `customer-reference-field`, `transport-reference-field` — sidebar/toolbar text inputs
   - `on-hold-button` — Hold toggle in footer (checkbox still nested: `.locator('input[type="checkbox"]')`)
   - `status-change-button-main`, `status-change-button-dropdown` — split-button halves
   - `status-crumbs` — footer status sequence (for hover popover tests)
10. **The dialog accept button is `OK`** — not Confirm/Yes/Delete. Use `name: 'OK', exact: true`.

## Test-data assumptions

- Tamaki Store on `http://localhost:3005`, user `admin`
- At least one customer named "General" visible
- Items with stock for `pickItemWithStock` to find quickly (it tries up to 30 items alphabetically)
- For `cannot delete a Shipped shipment`, `filter by Reference`, and `pagination next-page`: needs an existing Shipped shipment / a shipment with a reference / >20 shipments. Tests `test.skip()` if conditions aren't met rather than fail.
- **Tests leave behind data** — every run creates several shipments. No cleanup. Fine for dev, but as shipment count grows the pagination/filter tests could slow.

## Known technical debt

- Column-index based assertions are fragile if anyone reorders columns. Better: find column by header text, derive index dynamically.
- Several tests duplicate the "shipment URL → reload → assert" pattern; could become its own helper.

## Suggested next batches (priority order)

1. **More list-view filters & pagination** — other filter types (Status, Created date, Shipped date), page-number / first / last pagination buttons. Reuses patterns already in the spec.
2. **Shipped-state enforcement** — lines can't be edited on a Shipped shipment (click an existing line on a Shipped shipment → expect no edit modal).
3. **Line operations** — Add from Master List, Edit line, Delete line, Pack size dropdown, manual allocation, placeholder + allocate. Expect to re-encounter all the dialog gotchas above.
4. **Move on to Requisitions, Customer Returns, Customers** — entire sections of the regression test untouched, but the patterns above should transfer.
