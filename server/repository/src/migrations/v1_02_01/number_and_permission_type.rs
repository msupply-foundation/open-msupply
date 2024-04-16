use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"ALTER TYPE number_type ADD VALUE 'PRESCRIPTION';
        ALTER TYPE permission_type ADD VALUE 'PRESCRIPTION_QUERY';
        ALTER TYPE permission_type ADD VALUE 'PRESCRIPTION_MUTATE';
        "#
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
