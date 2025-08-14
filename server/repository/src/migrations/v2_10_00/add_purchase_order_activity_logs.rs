use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_activity_logs"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_AUTHORISED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_UNAUTHORISED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CONFIRMED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_FINALISED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_DELETED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_LINE_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_LINE_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_LINE_DELETED';
                "#
            )?;
        }
        Ok(())
    }
}
