use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    crate::migrations::sql!(
        connection,
        r#"
        ALTER TYPE encounter_status ADD VALUE 'DELETED' AFTER 'CANCELLED';
        "#,
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_connection: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}
