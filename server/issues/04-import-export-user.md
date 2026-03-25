---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: user (user_account) table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export user account records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional |
| `username` | String | Yes | **Unique**. Used as lookup key |
| `password` | String | On insert only | Plain text — will be hashed on import. **Never included in export** |
| `email` | String | No | |
| `language` | Enum | Yes | `ENGLISH`, `FRENCH`, `SPANISH`, `LAOS`, `KHMER`, `PORTUGUESE`, `RUSSIAN`, `TETUM` |
| `first_name` | String | No | |
| `last_name` | String | No | |
| `phone_number` | String | No | |
| `job_title` | String | No | |

### ID Resolution

- **Primary lookup**: `username` (unique)
- **On export**: Include `id` and `username`

### Special Handling

- **Password**: On import, accept a plain-text password and hash it before storage. On export, **never include the password or hash** — the column should be omitted or empty.
- **Update vs Insert**: If a matching `username` exists, update the record (but do NOT overwrite the password unless a new password value is explicitly provided in the row).

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `last_successful_sync` | DateTime | System-managed — useful for identifying stale accounts |

### Fields excluded from export

- `hashed_password` — never exported; imported as plain-text `password` field

### Dependencies

None.

### Referenced by

- `user_permission.user_id`

### Acceptance Criteria

- [ ] Can export users to Excel (without passwords)
- [ ] Can import new users with plain-text passwords (hashed on save)
- [ ] Can update existing users by `username` match
- [ ] Password is never included in export
- [ ] Updating a user without providing a password leaves existing password unchanged
- [ ] Round-trip: export then re-import produces no changes (password column empty on re-import is ignored)

### Moneyworks Jobcode

OMS:DFGEN

