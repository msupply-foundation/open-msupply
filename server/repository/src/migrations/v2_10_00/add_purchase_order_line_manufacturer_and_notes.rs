use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_line_manufacturer_and_notes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE purchase_order_line ADD COLUMN manufacturer_link_id REFERENCES name_link(id);
            ALTER TABLE purchase_order_line ADD COLUMN note TEXT;
            ALTER TABLE purchase_order_line ADD COLUMN unit_of_packs TEXT;
            "#
        )?;

        Ok(())
    }
}
