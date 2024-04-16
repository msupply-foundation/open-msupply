use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(connection, r#"ALTER TYPE key_type ADD VALUE 'LOG_LEVEL';"#)?;
    sql!(
        connection,
        r#"ALTER TYPE key_type ADD VALUE 'LOG_DIRECTORY';"#
    )?;
    sql!(
        connection,
        r#"ALTER TYPE key_type ADD VALUE 'LOG_FILE_NAME';"#
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
