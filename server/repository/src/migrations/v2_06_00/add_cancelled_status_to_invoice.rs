use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cancelled_status_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'CANCELLED';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'PRESCRIPTION_STATUS_CANCELLED' AFTER 'PRESCRIPTION_STATUS_VERIFIED';
                "#,
            )?;
        }
        Ok(())
    }
}
