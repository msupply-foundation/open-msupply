use crate::StorageConnection;

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TYPE invoice_type ADD VALUE 'PRESCRIPTION';
        "#,
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE invoice ADD clinician_id TEXT REFERENCES clinician(id);
        "#
    )?;

    Ok(())
}
