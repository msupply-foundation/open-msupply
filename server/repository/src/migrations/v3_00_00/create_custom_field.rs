use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_custom_field"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // `value_type` and `kind` are stored as plain TEXT (not native PG enums)
        // so that a remote on an older build can accept an unrecognised value
        // sent over v7 — the `CustomFieldValueType` / `CustomFieldKind` Rust enums
        // parse unknown values into an `Other(String)` catch-all rather than the
        // DB rejecting them. `kind` defaults to 'STANDARD'.
        sql!(
            connection,
            r#"
            CREATE TABLE custom_field (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                value_type TEXT NOT NULL,
                kind TEXT NOT NULL DEFAULT 'STANDARD',
                deleted_datetime {DATETIME}
            );

            CREATE TABLE custom_field_option (
                id TEXT NOT NULL PRIMARY KEY,
                custom_field_id TEXT NOT NULL REFERENCES custom_field(id),
                key TEXT NOT NULL,
                name TEXT NOT NULL,
                -- NOT a FK constraint:
                -- Parent-before-child is not guaranteed in sync (e.g. legacy name
                -- category 1 is a self-referential hierarchy within one sync
                -- table, integrated in cursor order with no retry), so a FK here
                -- would drop any child that arrives before its parent. Mirrors 
                -- `category.parent_id` decision for the same reason.
                parent_option_id TEXT,
                deleted_datetime {DATETIME},
                UNIQUE (custom_field_id, key)
            );

            CREATE TABLE custom_field_scope (
                id TEXT NOT NULL PRIMARY KEY,
                custom_field_id TEXT NOT NULL REFERENCES custom_field(id),
                scope TEXT NOT NULL,
                -- Per-scope display mode (HIDDEN / VISIBLE / PROMINENT). Plain
                -- TEXT, not a native enum, for the same v7 forwards-compatibility
                -- reason as `value_type` above: an unrecognised mode parses into
                -- the `CustomFieldDisplayMode::Other` catch-all rather than the DB
                -- rejecting it.
                display_mode TEXT NOT NULL DEFAULT 'VISIBLE',
                UNIQUE (custom_field_id, scope)
            );
            "#
        )?;

        // No changelog enum changes needed on PG: `changelog.table_name` is plain
        // TEXT after `alter_changelog_table_for_sync_v7` (which drops the old
        // `changelog_table_name` PG type). `value_type` is TEXT by design (see
        // comment above).

        Ok(())
    }
}
