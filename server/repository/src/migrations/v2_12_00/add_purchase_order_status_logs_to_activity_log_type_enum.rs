use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_status_logs_to_activity_log_type_enum.rs"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE 'PURCHASE_ORDER_STATUS_CHANGED_FROM_SENT_TO_CONFIRMED';
                    ALTER TYPE activity_log_type ADD VALUE 'PURCHASE_ORDER_LINE_STATUS_CLOSED';

                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
            "#,
            )?;
        }

        Ok(())
    }
}
