use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "stock_line_barcode_id"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE stock_line ADD barcode_id TEXT REFERENCES barcode(id);
                "#
        )?;
        Ok(())
    }
}
