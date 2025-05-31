use crate::{
    migrations::{sql, MigrationFragment},
    StorageConnection,
};
use util::constants::PLUGIN_USER_ID;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_plugin_user"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO user_account(id, username, hashed_password)
            VALUES ('{PLUGIN_USER_ID}', '{PLUGIN_USER_ID}', '')
        "#
        )?;

        Ok(())
    }
}
