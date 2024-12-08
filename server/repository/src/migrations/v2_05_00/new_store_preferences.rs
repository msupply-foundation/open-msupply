use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "new_store_preferences"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD keep_requisition_lines_with_zero_requested_quantity_on_finalised BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE store_preference ADD use_consumption_and_stock_from_customers_for_internal_orders BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE store_preference ADD manually_link_internal_order_to_inbound_shipment BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
