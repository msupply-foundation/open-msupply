use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(connection, r#"ALTER TYPE invoice_type ADD VALUE 'REPACK';"#)?;
    sql!(connection, r#"ALTER TYPE number_type ADD VALUE 'REPACK';"#)?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
