use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_manufacture_date_to_stock_and_invoice_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN manufacture_date DATE;
                ALTER TABLE stock_line ADD COLUMN manufacture_date DATE;
            "#
        )?;

        Ok(())
    }
}
