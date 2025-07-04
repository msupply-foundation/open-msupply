use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "non_nullable_item_in_purchase_order_line"
    }
    // TODO decide how to handle migrations for purchase orders
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // sql!(
        //     connection,
        //     r#"

        //     "#
        // )?;

        Ok(())
    }
}
