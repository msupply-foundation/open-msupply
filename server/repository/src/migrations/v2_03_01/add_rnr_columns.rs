use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_rnr_columns"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Note: We don't have a `snapshot_losses` - not required for system to pre-calculate this column at this stage
            r#"
                ALTER TABLE rnr_form_line ADD COLUMN entered_losses {DOUBLE} DEFAULT 0.0;
                ALTER TABLE rnr_form_line ADD COLUMN minimum_quantity {DOUBLE} NOT NULL DEFAULT 0.0;
            "#
        )?;

        Ok(())
    }
}
