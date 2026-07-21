# Inbound Shipments — implementation notes

Built from [`spec/inbound-shipments`](../../../spec/inbound-shipments/README.md)
against the live schema, matching the `stocktakes` reference vertical's shape
(URL-backed list/detail state, the single never-throwing query method, resource

- splice global state, per-file GraphQL codegen). `pnpm check`, `tsc`, `pnpm
test`, and codegen (validated against the running server) are all green.

## What's built

- **List (S1):** server-paginated `DataTable`, URL-backed filter/sort/page,
  columns (supplier + kind icon + colour swatch, status chip, number, linked
  order, created/delivered, comment, reference, total), status multi-select +
  name/number/reference/linked-order/date-range filters, New-shipment button
  (split button → "New external shipment" when procurement is on), CSV/Excel
  export, bulk delete (New rows only), Make a copy (single selection).
- **Create (S2):** manual supplier pick → create + navigate; from-a-purchase-
  order flow (Sent POs, seed all/no lines → `...External`).
- **Detail (S3):** twin-aware header saves (plain vs `...External` by
  `purchaseOrderId`), toolbar (supplier / reference / received-date with the
  backdating gate / PO number+ref / kind banner / line search), side panel
  (donor, edited-by, created, colour, comment, related documents, charges with
  editable tax, service-charges edit, read-only foreign-currency, transport
  details on transfers, record actions), status footer (Hold toggle,
  `StatusIndicator` by kind, submitted-not-pre-validated status-change split
  button with inline rejection), tabs (Details · Financial · Currency ·
  Delivery [PO-linked] · Documents · Log), line table (columns gated by
  preference + kind).
- **Line editor (S4):** add (item search excluding on-shipment items) / edit an
  item's batches, add/duplicate/delete batch, gated VVM + donor fields, batch
  save.
- **Default-donor modal (S5)**, **service-line modal (S6)**, **add-from-master-
  list** modal, **duplicate**, **record delete**, **bulk line** delete / zero-
  quantity / change-location, **report/print** (delegates to the reports
  vertical).
- **Preferences:** extended `storeContext` with `inboundShipmentPreferences`
  (procurement, authorisation, backdating window, foreign currency, pack-to-one,
  manual internal-order linking) — the display/behaviour gates.

## Now also built (previously deferred)

- **Detail tabs Financial / Currency / Delivery / Documents** — Financial +
  Delivery line tables and the Currency header panel (charges, rate,
  cost-adjustment %) for PO-linked shipments; the **Documents tab** lists the
  shipment's documents and does **upload / download / delete** over the
  sync-file REST store (`/sync_files/invoice/<id>` — `src/domain/syncFiles.ts`,
  proxied in dev), disabled once Verified.
- **Add from internal order** — the Add-item menu offers it (gated by the
  manual-link preference + a linked internal order + not-a-transfer); a
  requisition-line picker pulls one line via `insertFromInternalOrderLines`.
- **Bulk line actions** — Delete, Zero-quantity, Change-location, **Change
  campaign/program**, and **Approve / Reject / Pending** (authorisation-gated).
- **Line editor PO-line add** — a PO-linked shipment's add mode picks a
  purchase-order line and cites `purchaseOrderLineId`; **OK & next** now
  advances to the next item on the shipment (edit mode) / add-another (add
  mode).
- **Foreign-currency change** — a change-currency modal (currencies picker +
  rate), gated to foreign-currency-enabled stores with a non-store supplier.
- **Manual-create internal-order-link step** — when the store allows manual
  linking, choosing a supplier offers linking one of its open internal orders
  before creation.
- **List supplier colour swatch inline-edit** — the list cell swatch edits the
  colour in place (`ColourTagPicker` → twin-aware update).

## Flagged: genuinely out of this vertical's spec scope

- **Return lines** — `rules.md` → Returns is explicitly "a related but separate
  flow … not specced here" (a shared return-eligible-shipment vertical), so the
  Return-lines selection action is intentionally NOT built here.
- **Barcode Scan** — `README.md` › Status: "barcode-scan-assisted line entry
  exists but is not specced in detail." No client barcode/camera UX is invented;
  needs the platform scanner contract first.
- **Responsive/tablet simplified layout** — `ui-surface.md` flags this as a
  known gap "not investigated to the same depth"; the shared `DataTable`'s
  compact/card mode is used, but no bespoke tablet surface is built.

## Missing shared components (registry ⛔)

- **Toast** — `spec/ui-standards/components.md` marks Toast ⛔ (reserved: must
  not carry an action outcome). The inbound spec's "lines skipped" and
  permission-denied toasts use an in-context `Alert` + the global error modal
  instead. A real Toast channel is still unbuilt in the library.
- **No dedicated building/warehouse icon** — `HomeIcon` marks a store-linked
  supplier (the `NameSearch` truck-vs-home convention). Add a warehouse glyph to
  `src/ui/icons` if a distinct one is wanted.

## Conformance-contract note

The reference vertical (`stocktakes`) ships **no colocated unit tests** — the
`AC-*` coverage is carried by the `e2e/` suites, so this vertical follows the
same shape (no per-AC `.test.tsx`). C1/C2 traceability would be met by extending
the deterministic e2e suites, not by tests added here.
