---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: name_store_join table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk assign names (facilities/suppliers/customers) to stores.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `store_code` | String | Yes | **Lookup: `store.code`** (unique) |
| `name_code` | String | Yes | **Lookup: `name.code`** (composite with `name_type`) |
| `name_type` | Enum | Yes | **Lookup: `name.type`** — used with `name_code` to resolve `name_id` |
| `name_id` | String | No | Fallback ID. If both code+type and ID are provided, they must agree |
| `name_is_customer` | Boolean | Yes | Whether this name is a customer in this store |
| `name_is_supplier` | Boolean | Yes | Whether this name is a supplier in this store |

### ID Resolution

- **Primary lookup**: `store_code` + resolved `name_id` composite. A name should only be joined to a store once.
- **On export**: Include `id`, `store_code`, `name_code`, `name_type`, `name_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `store_code` | `store_id` | Lookup by `store.code` (unique) |
| `name_code` + `name_type` | `name_id` | Composite lookup on `name` table. If `name_id` also provided, both must resolve to the same record |

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `store_name` | String | Display name of the store |
| `name_name` | String | Display name of the name/facility record |

### Dependencies

- `name` (for `name_code` + `name_type` lookup)
- `store` (for `store_code` lookup)

### Acceptance Criteria

- [ ] Can export name-store assignments to Excel
- [ ] Can import new assignments from Excel
- [ ] Can match existing assignments by `store_code` + resolved `name_id`
- [ ] Ambiguous name lookups produce clear error
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

