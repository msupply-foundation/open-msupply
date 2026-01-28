use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_database_version_to_key_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'DATABASE_VERSION';"#
            )?;
        }

        Ok(())
    }
}
