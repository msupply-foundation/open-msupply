---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: store table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export store records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `code` | String | Yes | **Unique**. Used as lookup key |
| `site_id` | Integer | Yes | Remote site ID for sync |
| `logo` | String | No | Base64-encoded image |
| `store_mode` | Enum | Yes | `STORE`, `DISPENSARY` |
| `is_disabled` | Boolean | Yes | |
| `name_code` | String | Yes | **Lookup: `name.code`** (composite with `name_type`) |
| `name_type` | Enum | Yes | **Lookup: `name.type`** — used with `name_code` to resolve `name_id` |
| `name_id` | String | No | Fallback ID. If both code+type and ID are provided, they must agree |

### ID Resolution

- **Primary lookup**: `code` (unique)
- **On export**: Include `id`, `code`, `name_code`, `name_type`, and `name_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `name_code` + `name_type` | `name_id` | Composite lookup on `name` table. If `name_id` also provided, both must resolve to the same record |

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `created_date` | Date | Set automatically on creation |
| `name_name` | String | Display name from the resolved `name` record — helps identify the facility |

### Dependencies

- `name` (for `name_id` lookup)

### Referenced by

- `item_store_join.store_id`
- `name_store_join.store_id`
- `user_permission.store_id`
- `name.supplying_store_id`

### Acceptance Criteria

- [ ] Can export stores to Excel
- [ ] Can import new stores from Excel
- [ ] Can update existing stores by `code` match
- [ ] `name_id` resolved via `name_code` + `name_type` composite
- [ ] Ambiguous name lookups produce clear error
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

