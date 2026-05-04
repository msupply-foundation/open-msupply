use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_ancillary_item_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- The ratio (principal : ancillary) is stored as two numbers rather than a
                -- single decimal so the user's original x:y input is preserved exactly —
                -- e.g. "100:1" stays as (100, 1), "1:1.1" stays as (1, 1.1) — and we avoid
                -- losing precision through a y/x round-trip. At order time the ancillary
                -- count is computed as requested_quantity * ancillary_quantity / item_quantity.
                CREATE TABLE ancillary_item (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    ancillary_item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    item_quantity {DOUBLE} NOT NULL,
                    ancillary_quantity {DOUBLE} NOT NULL,
                    deleted_datetime {DATETIME}
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'ancillary_item';
                "#
            )?;
        }

        Ok(())
    }
}
