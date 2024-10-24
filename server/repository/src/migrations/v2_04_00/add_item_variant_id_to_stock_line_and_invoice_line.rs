use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_variant_id_to_stock_line_and_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE stock_line ADD COLUMN item_variant_id TEXT REFERENCES item_variant(id);
            ALTER TABLE invoice_line_id ADD COLUMN item_variant_id TEXT REFERENCES item_variant(id);
            "#
        )?;

        Ok(())
    }
}
