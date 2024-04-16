use crate::StorageConnection;

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"
            ALTER TABLE store_preference ADD COLUMN issue_in_foreign_currency bool NOT NULL DEFAULT false;
        "#
    )?;

    Ok(())
}
