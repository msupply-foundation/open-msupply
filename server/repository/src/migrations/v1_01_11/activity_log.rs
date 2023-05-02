use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;
    sql!(
        connection,
        r#"ALTER TYPE activity_log_type ADD VALUE 'INVOICE_NUMBER_ALLOCATED';"#
    )?;
    sql!(
        connection,
        r#"ALTER TYPE activity_log_type ADD VALUE 'REQUISITION_NUMBER_ALLOCATED';"#
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
