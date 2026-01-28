use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "repack_activity_log"
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'REPACK';"#
        )?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}
