use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "log_settings"
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'LOG_LEVEL';
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'LOG_DIRECTORY';
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'LOG_FILE_NAME';
            "#
        )?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}
