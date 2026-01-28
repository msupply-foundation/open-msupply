use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "user"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"ALTER TABLE user_account ADD last_successful_sync TIMESTAMP NOT NULL DEFAULT {DEFAULT_TIMESTAMP};"#,
        )?;

        Ok(())
    }
}
