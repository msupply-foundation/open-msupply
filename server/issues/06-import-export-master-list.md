---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: master_list table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export master list records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `code` | String | Yes | **Unique** (to be enforced). Used as lookup key |
| `name` | String | Yes | Display name |
| `description` | String | Yes | |
| `is_active` | Boolean | Yes | Set to `false` to soft-delete |
| `is_default_price_list` | Boolean | Yes | |
| `discount_percentage` | Decimal | No | |

### ID Resolution

- **Primary lookup**: `code` (unique — enforced by new constraint or service-layer validation)
- **On export**: Include `id` and `code`

### Prerequisites

- Enforce `master_list.code` uniqueness — add a unique constraint or service-layer validation (see general pattern issue)

### Dependencies

None.

### Referenced by

- `master_list_line.master_list_id`
- `master_list_name_join.master_list_id`
- `user_permission.context_id` (for program-scoped permissions)

### Acceptance Criteria

- [ ] `master_list.code` uniqueness is enforced
- [ ] Can export master lists to Excel
- [ ] Can import new master lists from Excel
- [ ] Can update existing master lists by `code` match
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

OMS:DFGEN

