use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_user_is_active"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE user_account ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            "#
        )?;

        Ok(())
    }
}
