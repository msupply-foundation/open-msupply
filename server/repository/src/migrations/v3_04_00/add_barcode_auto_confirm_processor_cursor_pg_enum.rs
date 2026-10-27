use crate::migrations::*;

/// Cursor for the processor on central that confirms a barcode when two stores
/// propose it for the same item.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_barcode_auto_confirm_processor_cursor_pg_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'BARCODE_AUTO_CONFIRM_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
