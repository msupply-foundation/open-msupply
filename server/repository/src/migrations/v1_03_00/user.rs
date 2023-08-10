use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"ALTER TABLE user_account ADD last_successful_sync TIMESTAMP NOT NULL DEFAULT 0;"#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"ALTER TABLE user_account ADD last_successful_sync TIMESTAMP NOT NULL DEFAULT 'epoch';"#,
    )?;

    Ok(())
}
