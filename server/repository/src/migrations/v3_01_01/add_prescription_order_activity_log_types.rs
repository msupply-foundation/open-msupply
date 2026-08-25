use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_order_activity_log_types"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_ORDER_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_ORDER_READY_TO_DISPENSE';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_ORDER_DISPENSED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PRESCRIPTION_ORDER_DELETED';
                "#
            )?;
        }

        Ok(())
    }
}
