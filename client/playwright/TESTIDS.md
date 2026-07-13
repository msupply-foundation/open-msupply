# Test-id reference

The deterministic suites in `e2e/` locate elements by `data-testid` rather than
text or markup, so the tests are independent of copy, styling, and component
internals. Any front-end that renders these ids on the equivalent elements can
run the suites unchanged.

Conventions: ids are kebab-case, stable across locales, and attached to the
interactive element (button, input) or the smallest meaningful container
(modal, alert, table cell).

## Shared ids

From common components — implemented once, available on every screen.

| test id | element |
| --- | --- |
| `dialog-button-<variant>` | modal buttons (`ok`, `cancel`, `next-and-ok`, …) |
| `confirmation-modal` | any "Are you sure?" confirmation dialog |
| `confirmation-modal-ok` | OK button of the standard confirmation modal (layout-based confirmations use `dialog-button-ok`) |
| `nothing-here` | table/list empty state |
| `table-pagination` | bottom toolbar of paginated list tables |
| `header-<columnId>` | table header cell — `columnId` is the column definition's id/accessor key verbatim, dots included (`item.code` → `header-item.code`) |
| `cell-<columnId>` | table body cell — scope by row: `row.getByTestId('cell-batch')` |
| `select-all-rows-checkbox` | header select-all checkbox (on the `<input>`) |
| `select-row-checkbox` | per-row selection checkbox (on the `<input>`) |
| `actions-footer` | bulk-action footer shown when rows are selected |
| `selected-rows-count` | "N Selected" label in the actions footer |
| `tab-<value>` | tabs — value lowercased, spaces → `-` (`tab-log`, `tab-batch`) |
| `item-option-code` / `item-option-name` | code / name within an item-search autocomplete option |
| `detail-panel` | right-hand detail side panel |
| `status-crumbs` | status breadcrumb strip in detail footers |

## Stocktake

List view and create modal:

| test id | element |
| --- | --- |
| `new-stocktake-button` | "New stocktake" button |
| `create-stocktake-modal` | the create modal |
| `stocktake-type-full` / `-filtered` / `-blank` | initialisation-mode radios |
| `stocktake-items-with-soh` / `stocktake-all-items` | full-mode sub-option radios |
| `stocktake-line-estimate` | "n lines estimated" alert |
| `blank-stocktake-notice` | blank-mode notice alert |

Detail view (list table column ids: `item.code`, `itemName`, `batch`,
`snapshotNumberOfPacks`, `countedNumberOfPacks`, `difference`, `reason`,
`comment`, …):

| test id | element |
| --- | --- |
| `add-item-button` | "Add item" button (disabled when read-only) |
| `description-field` | Description input (disabled when read-only) |
| `stocktake-status-alert` | "on hold / finalised — cannot be edited" alert |
| `delete-lines-button` / `change-location-button` / `reduce-lines-to-zero-button` | bulk actions |
| `on-hold-button` | On hold toggle |
| `status-change-button-main` / `-dropdown` | finalise split button (absent when read-only) |
| `delete-stocktake-button` | Delete action in the side panel |
| `comment-field` | comment textarea in the side panel |

Line-edit ("Add item") modal:

| test id | element |
| --- | --- |
| `add-item-modal` | the modal |
| `tab-batch` / `tab-pricing` / `tab-other` | tabs |
| `add-batch-button` | "Add batch (+)" button |
| `stocktake-line-error` | per-line error alert (e.g. reason required) |
| `cell-batch`, `cell-countedNumberOfPacks` | editable cells (contain an `<input>`) |
| `cell-snapshotNumberOfPacks` | snapshot cell (read-only — no input) |
| `cell-inventoryAdjustmentReasonInput` | reason cell (contains a `role=combobox`) |

## Shared ids (continued): filters, export, selection footer

From common components used by every list view:

| test id | element |
| --- | --- |
| `filters-menu` | the "Filters" dropdown that reveals filter inputs |
| `filter-input-<urlParameter>` | a revealed filter input — parameter verbatim (`filter-input-otherPartyName`, `filter-input-invoiceNumber`, `filter-input-status`, `filter-input-theirReference`) |
| `export-csv-main` / `-dropdown` | Export CSV split button |
| `delete-lines-button` | bulk Delete action in the selection footer (list views and detail line tables) |
| `nothing-here-create-button` | "Create a new one" button inside the empty state |
| `colour-picker-button` | colour-selector trigger (list rows and detail side panel) |

## Distribution

List views (column ids for `header-` / `cell-`: `otherPartyName`, `status`,
`invoiceNumber`, `createdDatetime`, `theirReference`, `comment`):

| test id | element |
| --- | --- |
| `new-shipment-button` / `new-return-button` / `new-requisition-button` | "New …" buttons on the three list views |
| `customer-search-modal` | customer picker modal (new shipment / return) |
| `create-requisition-modal` | new-requisition modal (Program/General tabs) |

Outbound detail view:

| test id | element |
| --- | --- |
| `add-item-button` | "Add item" (toolbar); on requisitions it's a split button — `add-item-button-main` / `-dropdown` |
| `add-item-modal` | the line add/edit modal |
| `status-change-button-main` / `-dropdown` | Confirm-status split button (outbound + customer-return footers) |
| `on-hold-button` | Hold toggle (contains the checkbox `<input>`) |
| `comment-field`, `customer-reference-field`, `transport-reference-field` | side-panel / toolbar inputs |
| `edit-service-charges-button` | pencil action in the Invoice details panel |
| `service-charges-modal`, `add-charge-button` | service charges modal + its add action |

## Non-testid hooks

Also relied on by the suites:

| hook | element |
| --- | --- |
| `#stock-item-search-input` | DOM id on the item-search input |
| `role=option` / `role=menuitem` | entries in autocomplete and menu popups (item search, reason pickers, filter/status menus) |
| `tbody tr` | table rows (cells within carry `cell-<columnId>`) |
| `aria-selected` on `tab-*` | active-tab state |
| `Go to next page` / `Go to page N` (aria) | MUI pagination buttons inside `table-pagination` |
| `Close` (aria, exact) | detail-view close button |
| `aria-label="<colour>"` | swatches inside the colour-picker popover |
