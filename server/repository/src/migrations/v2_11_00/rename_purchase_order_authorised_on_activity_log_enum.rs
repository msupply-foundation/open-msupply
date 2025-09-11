use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_purchase_order_authorised_on_activity_log_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type RENAME VALUE 'PURCHASE_ORDER_AUTHORISED' to 'PURCHASE_ORDER_REQUEST_APPROVAL';
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
