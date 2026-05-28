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
- Filter by Status (select-type filter)
- Pagination next-page navigation
- Pagination page-number click (jumps directly to chosen page)
- Export to CSV downloads
- Delete a New shipment (single row)
- Multi-select master checkbox deletes multiple
- Shipped shipments can't be deleted (rejection toast)

**Outbound Shipments — detail view sidebar**

- Sidebar panels render expected fields (Additional info, Related docs, Invoice details, Transport details)
- Comment edit persists
- Customer reference persists
- Transport reference persists
- Hold checkbox toggles on
- Colour picker (selecting a colour fires the update mutation)
- Edit Service Charges modal: add charge + save (skips if no default service item configured)
- Log tab loads
- Close button returns to list

**Outbound Shipments — line operations**

- Add Item: typing in the item field filters the options
- Edit shipment line: click row opens edit modal with item field locked
- Add Item: OK & Next saves then resets the dialog for the next line
- Delete shipment line via row selection (group-aware: clicks the grouped row's checkbox)
- Shipped: clicking a line does not open the edit modal

**Outbound Shipments — status flow**

- Happy path: create → Allocated → Picked → Shipped
- Hold on Picked prevents advancing to Shipped
- Hold on Allocated prevents advancing to Picked
- Un-hold allows status to advance again
- Skip statuses via split-button (New → Shipped directly)
- Status hover history popover

**Customer Returns**

- List view renders core controls (New return, Status header, rows-per-page)
- New return: pick customer creates a manually-created return and lands on detail

**Customer Requisitions**

- List view renders core controls (New requisition, Status header, rows-per-page)
- New requisition: pick customer creates a manual requisition (Add Item enabled on detail)

## Not tested ❌

**Outbound Shipments**

- Other filter types: Created date, Shipped date (between-date pickers — MUI date picker is brittle in jsdom; left for follow-up)
- Add from Master List
- Pack-size dropdown, manual per-batch allocation (data-dependent: needs items with multi-pack-size / multi-batch stock)
- Placeholder lines + bulk allocate placeholders (data-dependent: would need a stock-short item)
- View modes (Group by item switch, Show / Hide columns) — both are MRT internals; smoke tests dropped as low-value
- Return lines bulk action from an outbound (needs Shipped-or-later status — same workflow gap as DELIVERED/VERIFIED)
- Print one or many shipments (PDF download)
- Customer name change on existing shipment

**External-setup gaps (not doable on single store)**

- DELIVERED / VERIFIED status transitions (need customer-store confirmation)
- Inbound shipment generated on Picked (cross-store visibility check)
- Barcode scanner (hardware)
- Sync working (needs a second sync endpoint)

**Customer Returns**

- Customer Return from an outbound shipment (Process return → Reason → Comment → Confirm)
- From-stock: full Verified flow + ledger entry assertion
- Hold checkbox on a return
- Confirm Delivered / Confirm Verified status transitions

**Customer Requisitions**

- Receiving auto-generated customer requisitions (needs internal order from another store)
- Item-edit page: SOH/AMC numbers reflect requesting store, Quantity to Supply editable, Next / Previous navigation
- Finalise without outbound shipment shows warning prompt
- Once Finalised, no edits possible

**Customers — not started**

- List shows visible customers per current store
- Visibility configuration check (central-side)

---

# Handover notes

## How to run

- All tests: `cd client && BASE_URL=<your-base-url> yarn e2e distribution-regression --headed --workers 1` (e.g. `BASE_URL=http://localhost:3003`)
- Filter to one: `-g "search by customer"` (case-insensitive substring match on test name)
- Faster: drop `--headed` for headless (no visible browser)
- HTML report after a run: `npx playwright show-report playwright/playwright-report`

## Helpers worth knowing

- `createNewShipment(page)` — new shipment via UI, returns URL
- `addLineToShipment(page)` — Add Item with first stocked item, qty 2, includes the OK-button retry pattern (the dialog needs 2-3 OK clicks because of a React state race)
- `pickItemWithStock(page, dialog)` — walks the item autocomplete looking for one with `Available: N > 0`. Dismisses popups after picking.
- `clickConfirmAndWait(page, regex)` — clicks a footer Confirm button, handles the optional "Are you sure?" confirmation dialog, waits for network settle. Includes `page.mouse.move(0, 0)` to dismiss the status-history hover popover that otherwise blocks clicks.
- `getColumnIndex(page, headerText)` — looks up a column's zero-based index by header text. Use this instead of hard-coded `td.nth(N)` so tests survive column reordering.
- `assertFieldPersistsAcrossReload(page, shipmentUrl, testid, value)` — fills a debounced detail-view text field, waits for the `updateOutboundShipment` mutation, reloads via `shipmentUrl`, and asserts the value persisted.
- `openSidebar(page)` — widens the viewport to ≥1536px so the responsive detail panel auto-opens. Locators inside the sidebar resolve even when it's at width:0, but clicks land underneath; call this before interacting with anything in the sidebar.

## Patterns / gotchas that took real time to discover

1. **`.MuiDialog-root` is unreliable** — matches multiple things (autocomplete popups, drawers, the actual dialog). Always use `getByRole('dialog', { name })` or filter by visible text.
2. **OK-button race in the Add Item dialog** — first click often gets swallowed mid-render. Always retry with `hover()` + `click()` in a loop until the dialog hides.
3. **MUI menu items use role `menuitem`, not `option`** — even when they're inside a listbox.
4. **Debounced text inputs** — Comment, Customer Ref, Transport Ref save via debounced GraphQL mutations. Don't reload immediately; wait for the actual mutation: `page.waitForRequest(req => req.postData()?.includes('updateOutboundShipment'))`.
5. **Hold short-circuit** — clicking a Confirm button on a held shipment shows the polite "Cannot change status because on hold" info toast and skips the confirmation dialog entirely. Source: `StatusChangeButton.tsx`'s `onStatusClick`.
6. **Status-history popover** — hovering the status sequence in the footer shows a popover that overlays the Confirm buttons. `page.mouse.move(0, 0)` before clicking Confirm dismisses it.
7. **Network-idle is too weak for debounced filters** — the request hasn't fired yet. Wait for the actual GraphQL request with text matching the search term.
8. **Column indices in the list table** (default order): 0 checkbox, 1 Name, 2 Status, 3 Number, 4 Created, 5 Reference, 6 Comment, 7 Total. Columns are reorderable in the UI, so tests use `getColumnIndex(page, 'Name')` to look up the position by header text rather than hard-coding `td.nth(N)`.
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

- A populated dev datafile served on the configured `BASE_URL`, user `admin`
- At least one customer visible in the list
- Items with stock for `pickItemWithStock` to find quickly (it tries up to 30 items alphabetically)
- Tests use `test.skip()` rather than fail when the datafile lacks the right shape. Skips kick in for:
  - `filter by Reference` — no shipment with a non-empty reference
  - `pagination next-page` / `pagination page-number click` — fewer than 21 shipments
  - `cannot delete a Shipped shipment` / `Shipped: clicking a line` — no Shipped shipment in the visible page
  - `Edit service charges modal` — no default service item configured on the store
  - `Add Item: typing in the item field` — first item's name is too short to filter on
- **Tests leave behind data** — every run creates several shipments. No cleanup. Fine for dev, but as shipment count grows the pagination / filter tests could slow.

## Suggested next batches (priority order)

1. **Line operations on the outbound detail view** — the biggest remaining outbound gap. Add from Master List, Pack size dropdown, manual per-batch allocation, placeholder line on over-issue, and the bulk Allocate placeholder lines action. All single-store-doable; the last three depend on items with the right stock shape (multiple batches, low stock).
2. **Customer Returns: the from-shipment flow** — currently only the manual flow is covered. Adding this needs a Shipped-or-later outbound first, then the bulk-action "Return lines" path with reason + comment + Confirm Delivered / Verified.
3. **Customer Requisitions: auto-generated and finalise-flow** — receiving a customer requisition (needs an internal order from another store, so paired with the cross-store gap), item-edit page (SOH / AMC / Qty to Supply / Next / Previous), Finalise-without-shipment warning prompt, and the once-finalised lockdown.
4. **Customers section** — entirely untouched. Visibility list smoke test is the only single-store-doable bit.

## Out-of-scope / blocked

- **Date-range filters** (Created date, Shipped date) — MUI date picker is brittle in jsdom-style tests; would need a dedicated approach.
- **DELIVERED / VERIFIED status transitions** — need a customer-side mSupply store to confirm receipt.
- **Inbound shipment visible to customer on Picked** — same cross-store dependency.
- **Barcode scanner add-item** — hardware.
- **Sync working** — needs a second sync endpoint.
- **View modes** (Group by item switch, Show / Hide columns) — MRT internals; smoke-tested elsewhere, low signal here.
- **Print** PDFs (one or many shipments, pick slip, delivery note, invoice) — covered by Playwright download capture, but not yet wired up.
