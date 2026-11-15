use crate::migrations::*;

/// Item variants created on central only to hold a barcode are flagged, so they
/// can be kept out of variant lists and pickers (decisions/2026-09-30_barcodes.md)
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_is_auto_created_to_item_variant"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE item_variant ADD COLUMN is_auto_created BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
