---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: General pattern for Excel-based data import and export"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

There is currently no way for administrators to bulk import or export editable reference data (users, items, stores, master lists, names, etc.) via a user-friendly file format. Setting up a new system or migrating data requires manual entry or direct database manipulation.

## Describe the solution you'd like

### Overview

Build a general-purpose import/export framework using **Excel (.xlsx) files** for the following tables:

- `user` (user_account)
- `user_permission`
- `item`
- `item_store_join`
- `unit`
- `store`
- `master_list`
- `master_list_line`
- `master_list_name_join`
- `name`
- `name_store_join`

### Design Principles

1. **Human-readable references, not raw IDs**: Where a field references another table, the import format should accept the human-readable **code** or **name** rather than requiring the user to know internal UUIDs. IDs should be accepted as an optional fallback for cases where codes are ambiguous.

2. **Code-based lookups for foreign keys**:
   | Referenced table | Lookup field | Notes |
   |---|---|---|
   | `user` | `username` | Unique |
   | `item` | `code` | Unique |
   | `store` | `code` | Unique |
   | `unit` | `name` | Error if ambiguous |
   | `master_list` | `code` | Enforce uniqueness (add constraint or service-layer validation) |
   | `name` | `code` + `type` | Code alone is not unique; composite required. `id` can be provided alongside; if both are present they must agree |
   | `location` | `code` (scoped to store) | Unique within a store context |
   | `location_type` | `code` | New field — see prerequisites |
   | `currency` | `code` | ISO codes, effectively unique |

3. **ID as optional fallback**: Every row may include an `id` column. If provided, it takes precedence over code-based lookup. If omitted, the system generates a new UUID on insert or resolves via code lookup on update.

4. **Export includes both ID and code**: Exported files should include both the `id` and the human-readable code/name for each reference, so that exported files can be re-imported without modification.

### Import Flow

1. User uploads an Excel file via the UI
2. Server parses the file and validates:
   - Required fields are present
   - Enum values are valid
   - Foreign key references resolve (by code or ID)
   - No ambiguous lookups (error with details if a code matches multiple records)
3. Server returns a **preview/review** of the changes (new records, updated records, errors)
4. User confirms the import
5. Server applies the changes within a transaction

### Export Flow

1. User selects a table and optional filters
2. Server generates an Excel file with:
   - A header row with column names
   - Human-readable reference columns alongside ID columns
   - All editable fields populated
   - **Export-only columns** for reference (ignored on re-import)
3. File is downloaded

### Export-only Columns Convention

Some columns are included in exports for the user's reference but are **ignored on import**. These fall into two categories:

1. **System-managed timestamps**: e.g. `created_date`, `created_datetime`, `last_successful_sync`. Useful for the user to see but not editable.
2. **Denormalized display names for FK references**: When a table references another via code, the export also includes the referenced record's display name so the user can understand what each code refers to without needing to cross-reference. e.g. `item_name` alongside `item_code`, `store_name` alongside `store_code`.

On import, these columns should be silently ignored if present (to support round-tripping exported files).

### Error Handling

- If a code-based lookup returns **zero matches**: error — "referenced record not found"
- If a code-based lookup returns **multiple matches**: error — "ambiguous reference, please provide id instead"
- **If both code and ID are provided for the same FK**: resolve both independently. If they point to the same record, proceed. If they point to different records, error — "code and id conflict: `<code>` resolves to `<resolved_id>` but id column contains `<provided_id>`". This catches copy-paste mistakes where a user updates one column but forgets to update the other.
- Row-level errors should not abort the entire import; collect all errors and present them to the user

### Prerequisites

Before implementing individual table importers, the following foundational work is needed:

1. **Add `code` field to `location_type` table** — currently only has `id` and `name`. Populate from `name`; if duplicates exist, append a numeric suffix (e.g. `Cold_Room`, `Cold_Room_2`)
2. **Enforce `master_list.code` uniqueness** — add a unique constraint or service-layer validation
3. **Excel parsing library** — use existing excel library uymaispreadsheet
4. **Shared import/export service infrastructure** — generic validation, preview generation, and transactional apply logic

### Import Order (dependency resolution)

Tables must be imported in dependency order:

1. `unit` (no dependencies)
2. `name` (depends on `currency`)
3. `store` (depends on `name`)
4. `user` (no dependencies)
5. `item` (depends on `unit`, `location_type`)
6. `master_list` (no dependencies)
7. `master_list_line` (depends on `item`, `master_list`)
8. `master_list_name_join` (depends on `master_list`, `name`)
9. `name_store_join` (depends on `name`, `store`)
10. `item_store_join` (depends on `item`, `store`, `location`)
11. `user_permission` (depends on `user`, `store`, `master_list`)

### Describe alternatives you've considered

- **CSV files**: Simpler but no multi-sheet support; Excel allows bundling related tables in one workbook; Excel allows for cell formating to avoid issues with leading zeros, date formats, when csv if opened in Excel
- **JSON import via API**: More precise but not user-friendly for non-technical administrators
- **Sync protocol**: Already exists but is designed for system-to-system communication, not human editing
- **Single column for code-or-ID**: Instead of separate code and ID columns per FK, use a single column that accepts either a code or a UUID. Rejected because exports wouldn't know which to populate, breaking round-trip compatibility. The chosen approach (separate code and ID columns, both populated on export, conflict-checked on import) keeps exports unambiguous and round-trippable while still catching user errors.

### Additional context

Each table will have its own issue with specific field mappings and lookup resolution details. See linked issues.

### Acceptance Criteria

- [ ] Excel parsing/writing infrastructure is in place
- [ ] `location_type.code` field has been added
- [ ] `master_list.code` uniqueness is enforced
- [ ] Generic import flow exists: upload -> validate -> preview -> confirm -> apply
- [ ] Generic export flow exists: select table -> filter -> download
- [ ] Error reporting is row-level with clear messages about lookup failures
- [ ] Exported files are round-trippable (can be re-imported without modification)

### Moneyworks Jobcode
