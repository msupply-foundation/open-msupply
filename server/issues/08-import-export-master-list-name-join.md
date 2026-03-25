---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: master_list_name_join table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk assign names (facilities) to master lists.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `master_list_code` | String | Yes | **Lookup: `master_list.code`** (unique) |
| `name_code` | String | Yes | **Lookup: `name.code`** (composite with `name_type`) |
| `name_type` | Enum | Yes | **Lookup: `name.type`** — used with `name_code` to resolve `name_id` |
| `name_id` | String | No | Fallback ID. If both code+type and ID are provided, they must agree |

### ID Resolution

- **Primary lookup**: `master_list_code` + `name_code` + `name_type` composite. A given name should only be assigned to a master list once.
- **On export**: Include `id`, `master_list_code`, `name_code`, `name_type`, `name_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `master_list_code` | `master_list_id` | Lookup by `master_list.code` (unique) |
| `name_code` + `name_type` | `name_id` | Composite lookup on `name` table. If `name_id` also provided, both must resolve to the same record |

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `master_list_name` | String | Display name of the master list |
| `name_name` | String | Display name of the name/facility record |

### Dependencies

- `master_list` (for `master_list_code` lookup)
- `name` (for `name_code` + `name_type` lookup)

### Acceptance Criteria

- [ ] Can export master list name assignments to Excel
- [ ] Can import new assignments from Excel
- [ ] Can match existing assignments by `master_list_code` + resolved `name_id`
- [ ] Ambiguous name lookups produce clear error
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

