use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_property_v2_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // `value_type` is stored as plain TEXT (not a native PG enum) so that a
        // remote on an older build can accept an unrecognised value type sent
        // over v7 — the `PropertyValueTypeV2` Rust enum parses unknown values
        // into an `Other(String)` catch-all rather than the DB rejecting them.
        sql!(
            connection,
            r#"
            CREATE TABLE property_v2 (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                value_type TEXT NOT NULL,
                is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
                deleted_datetime {DATETIME}
            );

            CREATE TABLE property_option_v2 (
                id TEXT NOT NULL PRIMARY KEY,
                property_id TEXT NOT NULL REFERENCES property_v2(id),
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
                UNIQUE (property_id, key)
            );

            CREATE TABLE property_table_v2 (
                id TEXT NOT NULL PRIMARY KEY,
                property_id TEXT NOT NULL REFERENCES property_v2(id),
                table_name TEXT NOT NULL,
                -- Per-scope display mode (HIDDEN / VISIBLE / PROMINENT). Plain
                -- TEXT, not a native enum, for the same v7 forwards-compatibility
                -- reason as `value_type` above: an unrecognised mode parses into
                -- the `PropertyDisplayModeV2::Other` catch-all rather than the DB
                -- rejecting it.
                display_mode TEXT NOT NULL DEFAULT 'VISIBLE',
                UNIQUE (property_id, table_name)
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
