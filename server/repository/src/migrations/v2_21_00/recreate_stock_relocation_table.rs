use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "recreate_stock_relocation_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DELETE FROM changelog WHERE table_name = 'stock_relocation';
                DROP TABLE stock_relocation;
            "#
        )?;

        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                DROP TYPE stock_relocation_status;
                CREATE TYPE stock_relocation_status AS ENUM ('NEW', 'CONFIRMED', 'FINALISED');
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
                    store_id TEXT NOT NULL REFERENCES store(id),
                    stock_movement_number BIGINT NOT NULL,
                    status {status_type} NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    created_by TEXT NOT NULL,
                    finalised_datetime {DATETIME},
                    comment TEXT
                );
            "#
        )?;

        Ok(())
    }
}
