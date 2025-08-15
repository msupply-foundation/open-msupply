use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "activity_log_goods_received"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'GOODS_RECEIVED_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'GOODS_RECEIVED_DELETED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'GOODS_RECEIVED_STATUS_FINALISED';
                "#
            )?;
        }
        Ok(())
    }
}
