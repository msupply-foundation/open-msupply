---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: name table"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

No way to bulk import/export name (facility/patient/supplier) records.

## Describe the solution you'd like

### Excel Format

| Column | Type | Required on insert | Notes |
|---|---|---|---|
| `id` | String | No | UUID. Optional fallback for ambiguous lookups |
| `name` | String | Yes | Display name |
| `code` | String | Yes | Used as part of composite lookup key |
| `type` | Enum | Yes | `FACILITY`, `PATIENT`, `BUILD`, `INVAD`, `REPACK`, `STORE`, `OTHERS`. Part of composite lookup key |
| `is_customer` | Boolean | Yes | |
| `is_supplier` | Boolean | Yes | |
| `supplying_store_code` | String | No | **Lookup: `store.code`**. If both code and `supplying_store_id` are provided, they must agree |
| `supplying_store_id` | String | No | Fallback ID |
| `first_name` | String | No | |
| `last_name` | String | No | |
| `gender` | Enum | No | `FEMALE`, `MALE`, `TRANSGENDER`, `TRANSGENDER_MALE`, `TRANSGENDER_MALE_HORMONE`, `TRANSGENDER_MALE_SURGICAL`, `TRANSGENDER_FEMALE`, `TRANSGENDER_FEMALE_HORMONE`, `TRANSGENDER_FEMALE_SURGICAL`, `UNKNOWN`, `NON_BINARY` |
| `date_of_birth` | Date | No | `YYYY-MM-DD` |
| `phone` | String | No | |
| `charge_code` | String | No | |
| `comment` | String | No | |
| `country` | String | No | |
| `address1` | String | No | |
| `address2` | String | No | |
| `email` | String | No | |
| `website` | String | No | |
| `is_manufacturer` | Boolean | Yes | |
| `is_donor` | Boolean | Yes | |
| `on_hold` | Boolean | Yes | |
| `next_of_kin_id` | String | No | UUID of another name record. No code lookup (too ambiguous) |
| `next_of_kin_name` | String | No | Denormalized display name |
| `is_deceased` | Boolean | Yes | |
| `national_health_number` | String | No | |
| `date_of_death` | Date | No | `YYYY-MM-DD` |
| `custom_data` | String | No | JSON string |
| `hsh_code` | String | No | |
| `hsh_name` | String | No | |
| `margin` | Decimal | No | |
| `freight_factor` | Decimal | No | |
| `currency_code` | String | No | **Lookup: `currency.code`** (ISO code). If both code and `currency_id` are provided, they must agree |
| `currency_id` | String | No | Fallback ID |

### ID Resolution

- **Primary lookup**: `code` + `type` composite. This is because `name.code` is NOT unique on its own — different name types can share codes.
- **Fallback**: If `code` + `type` still matches multiple records, the user must provide `id`.
- **On export**: Include `id`, `code`, and `type`.

### Export-only columns (ignored on import)

| Column | Type | Notes |
|---|---|---|
| `created_datetime` | DateTime | Set automatically on creation |
| `deleted_datetime` | DateTime | Soft-delete flag — included for reference but managed via a separate delete mechanism |

### Notes

- `custom_data` is included in both import and export as a raw JSON string; no structured expansion

### Dependencies

- `currency` (for `currency_code` lookup)
- `store` (for `supplying_store_id` lookup)

### Referenced by

- `store.name_id`
- `master_list_name_join.name_id`
- `name_store_join.name_id`
- `name.next_of_kin_id`

### Acceptance Criteria

- [ ] Can export names to Excel with human-readable references
- [ ] Can import new names from Excel
- [ ] Can update existing names by `code` + `type` composite match
- [ ] Ambiguous lookups produce a clear error requesting `id`
- [ ] `supplying_store_id` resolved via `store.code`
- [ ] `currency_id` resolved via `currency.code`
- [ ] Round-trip: export then re-import produces no changes

### Moneyworks Jobcode

OMS:DFGEN

