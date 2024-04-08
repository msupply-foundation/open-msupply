use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE user_account ALTER COLUMN last_successful_sync DROP NOT NULL;
        "#,
    )?;

    sql!(
        connection,
        r#"
            ALTER TABLE user_account RENAME COLUMN last_successful_sync TO old_last_successful;
            ALTER TABLE user_account ADD COLUMN last_successful_sync TIMESTAMP;
            UPDATE user_account SET last_successful_sync = old_last_successful;
            ALTER TABLE user_account DROP COLUMN old_last_successful;            
        "#,
    )?;

    Ok(())
}
