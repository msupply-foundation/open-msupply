use crate::migrations::*;

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"ALTER TABLE user_account ADD last_successful_sync TIMESTAMP NOT NULL DEFAULT {DEFAULT_TIMESTAMP};"#,
    )?;

    Ok(())
}
