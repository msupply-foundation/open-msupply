use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_totals_to_purchase_order_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order_line
                ADD COLUMN line_total DOUBLE PRECISION NOT NULL DEFAULT 0;
            "#,
        )?;

        // Backfill existing rows: total = price_per_pack_after_discount * (adjusted_number_of_units OR requested_number_of_units) / requested_pack_size
        // Use COALESCE for adjusted_number_of_units fallback, and NULLIF to avoid division by zero on pack_size
        // CAST to NUMERIC is required because Postgres ROUND(double precision, int) does not exist
        sql!(
            connection,
            r#"
                UPDATE purchase_order_line
                SET line_total = ROUND(
                        CAST(price_per_pack_after_discount
                        * COALESCE(adjusted_number_of_units, requested_number_of_units)
                        / COALESCE(NULLIF(requested_pack_size, 0), 1) AS NUMERIC),
                    2)
                ;
            "#,
        )?;

        Ok(())
    }
}
