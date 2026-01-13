use crate::migrations::*;
use util::constants::SYSTEM_USER_ID;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_system_user"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                INSERT INTO user_account(id, username, hashed_password)
                SELECT '{SYSTEM_USER_ID}', '{SYSTEM_USER_ID}', ''
                WHERE NOT EXISTS (SELECT 1 FROM user_account WHERE id = '{SYSTEM_USER_ID}');
            "#
        )?;

        Ok(())
    }
}
