---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: user_permission table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export user permission records. Permissions must be assigned one at a time per user per store.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `username` | String | Yes | **Lookup: `user_account.username`** (unique) |
| `store_code` | String | No | **Lookup: `store.code`** (unique). Null for server-level permissions like `SERVER_ADMIN` |
| `permission` | Enum | Yes | See permission values in general pattern issue |
| `context_code` | String | No | **Lookup: `master_list.code`** — for program-scoped permissions. If both code and `context_id` are provided, they must agree |
| `context_id` | String | No | Fallback ID |

### ID Resolution

- **Primary lookup**: `username` + `store_code` + `permission` + `context_code` composite. A user should not have duplicate permission entries for the same store and context.
- **On export**: Include `id`, `username`, `store_code`, `permission`, `context_code`, `context_id`

### Foreign Key Resolution

| Import column(s) | Resolves to | Lookup strategy |
|---|---|---|
| `username` | `user_id` | Lookup by `user_account.username` (unique) |
| `store_code` | `store_id` | Lookup by `store.code` (unique). May be null |
| `context_code` | `context_id` | Lookup by `master_list.code` (unique). If `context_id` also provided, both must resolve to the same record |

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `store_name` | String | Display name of the store |
| `context_name` | String | Display name of the master list (for program-scoped permissions) |

### Dependencies

- `user` (for `username` lookup)
- `store` (for `store_code` lookup)
- `master_list` (for `context_code` lookup)

### Acceptance Criteria

- [ ] Can export user permissions to Excel with human-readable usernames, store codes, and context codes
- [ ] Can import new permissions from Excel
- [ ] Can match existing permissions by `username` + `store_code` + `permission` + `context_code`
- [ ] Server-level permissions (null `store_code`) handled correctly
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

OMS:DFGEN

