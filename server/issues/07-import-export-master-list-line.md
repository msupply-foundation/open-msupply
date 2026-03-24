---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: master_list_line table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export master list line records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `item_code` | String | Yes | **Lookup: `item.code`** (unique) |
| `master_list_code` | String | Yes | **Lookup: `master_list.code`** (unique) |
| `price_per_unit` | Decimal | No | |

### ID Resolution

- **Primary lookup**: `item_code` + `master_list_code` composite. A given item should only appear once per master list.
- **On export**: Include `id`, `item_code`, `master_list_code`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `item_code` | `item_link_id` | Lookup by `item.code` (unique). Resolve through item_link table |
| `master_list_code` | `master_list_id` | Lookup by `master_list.code` (unique) |

### Dependencies

- `item` (for `item_code` lookup)
- `master_list` (for `master_list_code` lookup)

### Acceptance Criteria

- [ ] Can export master list lines to Excel with item codes and master list codes
- [ ] Can import new master list lines from Excel
- [ ] Can update existing lines by `item_code` + `master_list_code` composite match
- [ ] Duplicate item within same master list is rejected
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

