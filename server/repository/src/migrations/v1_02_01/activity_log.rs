use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_CREATED';
        ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_DELETED';
        "#
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
