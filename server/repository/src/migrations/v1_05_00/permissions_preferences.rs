use crate::StorageConnection;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN vaccine_module bool NOT NULL DEFAULT false;
            ALTER TYPE permission_type ADD VALUE 'SENSOR_QUERY';
            ALTER TYPE permission_type ADD VALUE 'SENSOR_MUTATE';        
        "#
        )?;
    } else {
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN vaccine_module bool NOT NULL DEFAULT false;
        "#
        )?;
    }

    Ok(())
}
