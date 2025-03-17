use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cancellation_fields_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let result = sql!(
            connection,
            r#"          
                ALTER TABLE invoice
                ADD COLUMN is_cancellation BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE invoice
                ADD COLUMN cancelled_datetime {DATETIME};
            "#,
        );

        if result.is_err() {
            log::warn!("Cancellation columns already exist on invoice table");
        }

        Ok(())
    }
}
