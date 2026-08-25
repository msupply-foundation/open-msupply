use crate::migrations::*;

/// Cursor for the processor that flips a prescription_order to DISPENSED when
/// its generated dispensing invoice is verified.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_order_status_processor_cursor_pg_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_ORDER_STATUS_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
