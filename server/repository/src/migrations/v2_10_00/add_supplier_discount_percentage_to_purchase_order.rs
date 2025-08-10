use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_supplier_discount_percentage_to_purchase_order"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order ADD COLUMN supplier_discount_percentage {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
