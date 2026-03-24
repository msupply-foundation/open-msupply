---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: unit table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export unit records. Units must be created one at a time.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional — generated if omitted on insert, used for matching on update |
| `name` | String | Yes | e.g. "Tablet", "Vial", "mL". Used as lookup key when `id` is not provided |
| `description` | String | No | |
| `index` | Integer | Yes | Sort order |
| `is_active` | Boolean | Yes | `true`/`false`. Set to `false` to soft-delete |

### ID Resolution

- **On import**: If `id` is provided, match by `id`. Otherwise, look up by `name`.
- **Ambiguity**: If `name` matches multiple active units, return an error for that row requesting the user provide `id`.
- **On export**: Include both `id` and `name`.

### Dependencies

None — `unit` has no foreign key references. Should be imported first.

### Referenced by

- `item.unit_id` — items reference units by `unit.name` in the import format

### Acceptance Criteria

- [ ] Can export all active units to Excel
- [ ] Can import new units from Excel
- [ ] Can update existing units by `id` or `name` match
- [ ] Ambiguous `name` lookups produce a clear error
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

