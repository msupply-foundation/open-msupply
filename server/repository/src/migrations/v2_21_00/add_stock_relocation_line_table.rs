use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_relocation_line_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE stock_relocation_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    stock_relocation_id TEXT NOT NULL REFERENCES stock_relocation(id),
                    stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
                    destination_stock_line_id TEXT REFERENCES stock_line(id),
                    source_location_id TEXT REFERENCES location(id),
                    destination_location_id TEXT REFERENCES location(id),
                    number_of_packs {DOUBLE} NOT NULL DEFAULT 0
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'stock_relocation_line';
                "#
            )?;
        }

        Ok(())
    }
}
