use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipping_method_id_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD COLUMN shipping_method_id TEXT REFERENCES shipping_method(id);
            "#
        )?;

        Ok(())
    }
}
