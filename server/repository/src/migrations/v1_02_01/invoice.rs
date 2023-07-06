use crate::StorageConnection;

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;
    sql!(
        r#"
            ALTER TYPE invoice_type ADD VALUE 'PRESCRIPTION';
        "#,
    )?;

    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"
        ALTER TABLE invoice ADD clinician_id TEXT REFERENCES clinician(id);
      "#
    )?;

    Ok(())
}
