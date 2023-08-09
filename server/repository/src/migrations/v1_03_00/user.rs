use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"ALTER TABLE user_account ADD last_successful_sync TIMESTAMP NOT NULL DEFAULT 0;"#,
    )?;

    Ok(())
}
