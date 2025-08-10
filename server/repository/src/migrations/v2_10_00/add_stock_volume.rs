use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_stock_volume"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN total_volume {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE stock_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE invoice_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
                ALTER TABLE stocktake_line ADD COLUMN volume_per_pack {DOUBLE} NOT NULL DEFAULT 0.0;
            "#
        )?;

        Ok(())
    }
}
