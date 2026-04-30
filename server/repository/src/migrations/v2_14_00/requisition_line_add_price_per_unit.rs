use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "requisition_line_add_price_per_unit"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN price_per_unit {DOUBLE};
            "#,
        )?;

        Ok(())
    }
}
