use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_extra_purchase_order_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE purchase_order_line ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
            ALTER TABLE purchase_order_line ADD COLUMN note TEXT;
            ALTER TABLE purchase_order_line ADD COLUMN unit TEXT;
            "#
        )?;

        Ok(())
    }
}
