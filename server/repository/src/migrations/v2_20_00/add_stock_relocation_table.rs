use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_relocation_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE stock_relocation_status AS ENUM ('SUGGESTED', 'FINALISED');
                "#
            )?;
            "stock_relocation_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE stock_relocation (
                    id TEXT NOT NULL PRIMARY KEY,
                    created_datetime {DATETIME} NOT NULL,
                    finalised_datetime {DATETIME},
                    from_stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
                    from_location_id TEXT REFERENCES location(id),
                    from_number_of_packs {DOUBLE} NOT NULL DEFAULT 0,
                    to_stock_line_id TEXT REFERENCES stock_line(id),
                    to_location_id TEXT REFERENCES location(id),
                    status {status_type} NOT NULL,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    user_id TEXT NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'stock_relocation';
                "#
            )?;
        }

        Ok(())
    }
}
