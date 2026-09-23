use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_line_total_to_purchase_order_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order_line
                ADD COLUMN line_total {DOUBLE} NOT NULL DEFAULT 0;
            "#,
        )?;

        sql!(
            connection,
            r#"
                UPDATE purchase_order_line
                SET line_total = price_per_pack_after_discount
                        * COALESCE(adjusted_number_of_units, requested_number_of_units)
                        / requested_pack_size
                WHERE requested_pack_size > 0;
            "#,
        )?;

        Ok(())
    }
}
