use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "activity_log"
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_CREATED';
            ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_DELETED';
            ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_STATUS_PICKED';
            ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_STATUS_VERIFIED';
            "#
        )?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}
