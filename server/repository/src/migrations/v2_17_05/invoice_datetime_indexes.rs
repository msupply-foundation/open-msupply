use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_datetime_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_invoice_picked_datetime ON invoice (picked_datetime);
            CREATE INDEX IF NOT EXISTS index_invoice_received_datetime ON invoice (received_datetime);
            CREATE INDEX IF NOT EXISTS index_invoice_verified_datetime ON invoice (verified_datetime);
            "#
        )?;
        Ok(())
    }
}
