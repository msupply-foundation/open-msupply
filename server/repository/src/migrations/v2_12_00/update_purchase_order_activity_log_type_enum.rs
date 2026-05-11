use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_purchase_order_activity_log_type_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type RENAME VALUE 'PURCHASE_ORDER_AUTHORISED' to 'PURCHASE_ORDER_REQUEST_APPROVAL';
                    ALTER TYPE activity_log_type ADD VALUE 'PURCHASE_ORDER_SENT';

                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                UPDATE activity_log SET type = 'PURCHASE_ORDER_REQUEST_APPROVAL' WHERE type = 'PURCHASE_ORDER_AUTHORISED';
            "#,
            )?;
        }

        Ok(())
    }
}
