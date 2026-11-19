use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cancelled_status_to_purchase_order"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order ADD COLUMN cancelled_datetime {DATETIME};
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'CANCELLED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CANCELLED';
                "#
            )?;
        }

        Ok(())
    }
}
