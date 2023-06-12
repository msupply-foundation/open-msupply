use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(connection, r#"ALTER TYPE key_type ADD VALUE 'LOG_LEVEL';"#)?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
