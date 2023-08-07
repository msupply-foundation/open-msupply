use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_CREATED';
        ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_DELETED';
        ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_STATUS_PICKED';
        ALTER TYPE activity_log_type ADD VALUE 'PRESCRIPTION_STATUS_VERIFIED';
        "#
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
