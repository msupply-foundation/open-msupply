---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: item_store_join table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export item visibility and pricing per store.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `item_code` | String | Yes | **Lookup: `item.code`** (unique) |
| `store_code` | String | Yes | **Lookup: `store.code`** (unique) |
| `default_sell_price_per_pack` | Decimal | Yes | Default 0.0 |
| `ignore_for_orders` | Boolean | Yes | Exclude from auto-ordering |
| `margin` | Decimal | Yes | Default 0.0 |
| `default_location_code` | String | No | **Lookup: `location.code`** scoped to the resolved store |
| `default_location_id` | String | No | Fallback ID. If both code and ID are provided, they must agree |

### ID Resolution

- **Primary lookup**: `item_code` + `store_code` composite. An item should only have one store join per store.
- **On export**: Include `id`, `item_code`, `store_code`, `default_location_code`, `default_location_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `item_code` | `item_link_id` | Lookup by `item.code` (unique). Resolve through item_link table |
| `store_code` | `store_id` | Lookup by `store.code` (unique) |
| `default_location_code` | `default_location_id` | Lookup by `location.code` **scoped to the resolved `store_id`**. If `default_location_id` also provided, both must resolve to the same record |

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `item_name` | String | Display name of the item |
| `store_name` | String | Display name of the store |
| `default_location_name` | String | Display name of the default location (if set) |

### Dependencies

- `item` (for `item_code` lookup)
- `store` (for `store_code` lookup)
- `location` (for `default_location_code` lookup, optional)

### Acceptance Criteria

- [ ] Can export item-store joins to Excel with item codes and store codes
- [ ] Can import new joins from Excel
- [ ] Can update existing joins by `item_code` + `store_code` composite match
- [ ] `default_location_id` resolved via `location.code` scoped to the store
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

