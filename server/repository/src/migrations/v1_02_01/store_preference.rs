use crate::StorageConnection;

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    sql!(
        connection,
        r#"
            ALTER TABLE store_preference ADD COLUMN om_program_module bool NOT NULL DEFAULT false;
        "#
    )?;

    Ok(())
}
