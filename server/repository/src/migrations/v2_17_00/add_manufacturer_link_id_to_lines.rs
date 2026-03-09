use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_manufacturer_link_id_to_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_invoice_line_manufacturer_link_id_fkey"
                    ON "invoice_line" ("manufacturer_link_id");

                ALTER TABLE stock_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_stock_line_manufacturer_link_id_fkey"
                    ON "stock_line" ("manufacturer_link_id");

                ALTER TABLE stocktake_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_stocktake_line_manufacturer_link_id_fkey"
                    ON "stocktake_line" ("manufacturer_link_id");
            "#
        )?;

        Ok(())
    }
}
