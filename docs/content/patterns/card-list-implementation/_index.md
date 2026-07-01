+++
title = "Card List Implementation"
weight = 40
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Card List Implementation

## Card View

### Overview

The **Card View** provides a card-based layout for displaying and editing data as an alternative to the traditional table layout. It was introduced in [PR #10725](https://github.com/msupply-foundation/open-msupply/pull/10725), initially for Inbound Shipment line editing. This replaces the previous tabbed table approach (Quantities / Pricing / Other tabs) with a single card per batch that shows all fields grouped visually.

The card view is built on top of the same **Material React Table** infrastructure used by our standard tables — it reads column definitions from `useSimpleMaterialTable` and renders them as cards instead of table rows.

> [!TIP]
> For a reference implementation, see the **Inbound Shipment** `InboundLineEditCards` component. This is the first full implementation using the card view, so refer to it if you're unsure how to do something.

### Architecture

The card view is composed of four generic components, all located in:

```
client/packages/common/src/ui/layout/tables/components/CardList/
```

- **`CardList`** — The top-level container. Takes a `table` instance (from any of our `useMaterialTable` hooks) and renders each row as a `CardListItem`. Also renders the column visibility toggle and a "reset to defaults" button.
- **`CardListItem`** — Renders a single card. Categorises visible cells into **summary cells** (shown in a heading row), **action cells** (buttons pinned to the heading row), and **data cells** (grouped into field groups).
- **`CardListFieldGroup`** — Renders a group of fields in a CSS grid layout, optionally prefixed with a group icon.
- **`CardListField`** — Renders a single label/value pair within a group.

All elements can be imported from `@open-msupply/common`.

### How it works

The card view uses the **same column definitions** and the **same `useSimpleMaterialTable` hook** as the table view. This means:

- Column visibility, ordering, and all user customisations are shared between card and table views (they use the same `tableId` for local storage persistence)
- The `Cell` component defined for each column is rendered inside the card — so editable inputs work the same way
- Filtering and sorting are not applicable in the card view context (the "Simple" table type doesn't use them)

### Usage

```tsx
const table = useSimpleMaterialTable<DraftInboundLine>({
  tableId: "inbound-line-edit",
  columns,
  data: lines,
  getIsRestrictedRow: isDisabled ? () => true : undefined,
});

return (
  <CardList
    table={table}
    tableId="inbound-line-edit"
    lastItemRef={lastCardRef}
    groupIcons={groupIcons}
    actions={actions}
  />
);
```

### CardList props

**Required**:

- `table`: `MRT_TableInstance<T>` The table instance from any of our `useMaterialTable` hooks
- `tableId`: `string` Must match the `tableId` used in the hook — used for resetting saved state

**Optional**:

- `lastItemRef`: `React.RefObject<HTMLDivElement>` Ref attached to the last card in the list. Useful for auto-scrolling when new items are added
- `groupIcons`: `Record<string, React.ReactNode>` A map of `columnGroup` names to icon components. When provided, fields are grouped visually with the icon displayed at the start of each group. When omitted, fields render in an ungrouped label/value layout (used for mobile list views)
- `actions`: `React.ReactNode` Additional action buttons to display in the sticky toolbar alongside the column visibility and reset buttons
- `stickyTopOffset`: `number` Offset (in px) for the sticky toolbar at the top of the card list. Defaults to `0`

### Column definition extensions for Card View

Three new properties have been added to our `ColumnDef<T>` type to control card-specific behaviour:

- **`columnGroup`**: `string` Logical grouping for the column (e.g. `'general'`, `'quantities'`, `'pricing'`, `'other'`). Columns with the same `columnGroup` are rendered together in a `CardListFieldGroup`. The order of groups follows the order columns are defined
- **`cardSummary`**: `(row: T) => React.ReactNode` When provided, the column's value appears as bold summary text in the card's heading row. The column still appears as an editable field within its group. Receives the row data and returns a formatted string, e.g.:
  ```ts
  cardSummary: (row) => `${t("label.batch")} ${row.batch || ""}`;
  ```
- **`cardSpan`**: `number` Number of CSS grid columns to span in the card layout. Defaults to `1`. Useful for wider fields like notes/comments

### Action columns

Columns with an empty `header` or `pin: 'right'` are treated as **action columns**. They render as icon buttons in the card's heading row (to the right of the summary text), rather than as labelled fields in the body. This is how the delete and duplicate buttons are positioned.

### Grouped vs ungrouped layout

The card view supports two distinct rendering modes, determined by whether `groupIcons` is provided:

- **Grouped** (with `groupIcons`): Fields are organised into visual groups using `CardListFieldGroup`, each with an icon prefix. Fields within each group are laid out in a responsive CSS grid (`repeat(auto-fill, minmax(200px, 1fr))`). This is used in the line edit modal.
- **Ungrouped** (without `groupIcons`): Fields render as simple label/value rows (label on the left, value on the right). This is used for mobile list views where cards replace the table entirely.

Example of defining group icons:

```tsx
const groupIcons = {
  general: <EditIcon />,
  quantities: <StockIcon />,
  pricing: <InvoiceIcon />,
  other: <SlidersIcon />,
};
```

### Responsive behaviour

- On **landscape tablets** (detected via `useIsLandscapeTablet`), padding and spacing are reduced, and the grid column minimum width shrinks from `200px` to `140px` for a more compact layout
- On **mobile** (extra small screens), the `CardList` is used directly in list views (e.g. Inbound Shipment list) with the ungrouped layout. Cards in mobile list views are not clickable for editing
- When the **Simplified Tablet UI** preference is enabled, group icons are omitted for a more compact card appearance

### Additional features

- **Duplicate Batch**: Each card can include a duplicate button (as an action column with `pin: 'right'`). When duplicated, the new card is appended to the bottom and auto-scrolls into view using `lastItemRef`
- **Add Batch**: The "Add Batch" button is passed as an `actions` prop to `CardList` and similarly auto-scrolls to the new card
- **Sticky Item Name**: In the Inbound Shipment line edit modal, the item selector and divider are sticky at the top, so the user always has context while scrolling through cards
- **Reset to Defaults**: Resets column visibility, order, sizing, pinning, and density to their initial state. Note: this does not currently respect global custom table defaults
- **Column Visibility**: The MRT column visibility menu (`MRT_ShowHideColumnsButton`) is available, allowing users to show/hide fields just as in table view
- **Empty state fallback**: When there are no rows, the card view uses the table's `renderEmptyRowsFallback`, showing the same "Nothing to display" UI as tables

### Where card view is currently used

- **Inbound Shipment line edit modal** (both internal and external) — grouped layout with editable fields
- **Inbound Shipment list view on mobile** — ungrouped layout, read-only cards
- **Inbound Shipment detail view on mobile** — ungrouped layout via `CardList` replacing the old `MobileCardList`

### Future improvements

- Hide field labels on mobile where they are self-explanatory (e.g. status)
- Experiment with accordion/collapsible groups
- Move action buttons (add batch, reset) into the modal header
- Support for global custom table defaults in the reset functionality
