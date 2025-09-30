use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_purchase_order_line_price_per_unit_per_pack"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order_line
                RENAME COLUMN price_per_unit_before_discount TO price_per_pack_before_discount;
                ALTER TABLE purchase_order_line
                RENAME COLUMN price_per_unit_after_discount TO price_per_pack_after_discount;
            "#
        )?;

        Ok(())
    }
}
