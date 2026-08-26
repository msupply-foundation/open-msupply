use crate::{migrations::sql, StorageConnection};
use util::constants::SYSTEM_USER_ID;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
