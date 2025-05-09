use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vvm_status_log_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE vvm_status_log (
                    id TEXT NOT NULL PRIMARY KEY,
                    status_id TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
                    comment TEXT, 
                    created_by TEXT NOT NULL, 
                    invoice_line_id TEXT REFERENCES invoice_line(id),
                    store_id TEXT NOT NULL REFERENCES store(id)
                );
            "#
        )?;

        Ok(())
    }
}
