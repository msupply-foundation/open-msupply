use crate::migrations::*;

/// Seed the barcode auto-confirm processor's cursor at the current changelog
/// head. barcode_proposal is new in this version, so nothing behind the head
/// needs processing, and without the seed the processor's first run would walk
/// the entire historical changelog (#12547).
///
/// Runs as its own fragment (own transaction) after the key_type enum value is
/// added, so Postgres can use the new enum value.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_barcode_auto_confirm_processor_cursor"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO key_value_store (id, value_int)
            SELECT 'BARCODE_AUTO_CONFIRM_PROCESSOR_CURSOR', COALESCE(MAX(cursor), 0)
            FROM changelog;
            "#
        )?;

        Ok(())
    }
}
