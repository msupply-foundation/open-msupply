---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: item table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export item records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `code` | String | Yes | **Unique**. Used as lookup key |
| `name` | String | Yes | Display name |
| `unit_name` | String | No | **Lookup: `unit.name`**. Fall back to `unit_id` |
| `unit_id` | String | No | Fallback if `unit_name` is ambiguous |
| `strength` | String | No | e.g. "500mg" |
| `ven_category` | Enum | Yes | `V`, `E`, `N`, `NOT_ASSIGNED` |
| `default_pack_size` | Decimal | Yes | |
| `type` | Enum | Yes | `STOCK`, `SERVICE`, `NON_STOCK` |
| `is_active` | Boolean | Yes | Set to `false` to soft-delete |
| `is_vaccine` | Boolean | Yes | |
| `vaccine_doses` | Integer | Yes | Number of doses per vial |
| `restricted_location_type_code` | String | No | **Lookup: `location_type.code`** (new field). Fall back to `restricted_location_type_id` |
| `restricted_location_type_id` | String | No | Fallback |
| `volume_per_pack` | Decimal | Yes | cm³ per pack |
| `universal_code` | String | No | Universal product code |

### ID Resolution

- **Primary lookup**: `code` (unique)
- **On export**: Include `id`, `code`, `unit_name`, `unit_id`, `restricted_location_type_code`, `restricted_location_type_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `unit_name` | `unit_id` | Lookup by `unit.name`. Error if ambiguous. Fall back to `unit_id` column |
| `restricted_location_type_code` | `restricted_location_type_id` | Lookup by `location_type.code` (new field). Fall back to ID column |

### Fields excluded from import

- `legacy_record` — system-managed JSON blob for sync

### Prerequisites

- `location_type.code` field must exist (see general pattern issue)

### Dependencies

- `unit` (for `unit_name` lookup)
- `location_type` (for `restricted_location_type_code` lookup)

### Referenced by

- `item_store_join.item_link_id`
- `master_list_line.item_link_id`

### Acceptance Criteria

- [ ] Can export items to Excel with human-readable unit names and location type codes
- [ ] Can import new items from Excel
- [ ] Can update existing items by `code` match
- [ ] `unit_id` resolved via `unit.name`, with `unit_id` as fallback
- [ ] `restricted_location_type_id` resolved via `location_type.code`, with ID as fallback
- [ ] Ambiguous lookups produce clear errors
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

