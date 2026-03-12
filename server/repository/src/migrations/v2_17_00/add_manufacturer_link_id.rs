use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_manufacturer_link_id_to_stock_line_invoice_line_stocktake_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                ALTER TABLE invoice_line ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                ALTER TABLE stocktake_line ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
            "#
        )?;

        Ok(())
    }
}
