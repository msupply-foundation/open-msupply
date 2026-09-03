use crate::migrations::*;

/// Cursor for the processor that flips a prescription_request to DISPENSED when
/// its generated dispensing invoice is verified.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_request_status_processor_cursor_pg_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_REQUEST_STATUS_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
