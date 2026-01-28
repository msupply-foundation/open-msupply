use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_supplier_id_to_stock_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"ALTER TABLE stock_line ADD supplier_id TEXT REFERENCES name(id);"#
        )?;

        Ok(())
    }
}
