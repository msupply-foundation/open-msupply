use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_id_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD COLUMN purchase_order_id TEXT REFERENCES purchase_order(id);
            "#
        )?;

        Ok(())
    }
}
