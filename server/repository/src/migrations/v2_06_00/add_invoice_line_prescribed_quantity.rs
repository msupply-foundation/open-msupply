use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_invoice_line_prescribed_quantity"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        //
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN prescribed_quantity DOUBLE PRECISION
            "#
        )?;

        Ok(())
    }
}
