use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_emergency_orders"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE program_requisition_order_type ADD is_emergency BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE program_requisition_order_type ADD max_items_in_emergency_order INTEGER NOT NULL DEFAULT 0;
            "#
        )?;

        Ok(())
    }
}
