use crate::StorageConnection;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE permission_type ADD VALUE 'SENSOR_QUERY';
            ALTER TYPE permission_type ADD VALUE 'SENSOR_MUTATE'; 
            ALTER TYPE permission_type ADD VALUE 'TEMPERATURE_BREACH_QUERY';
            ALTER TYPE permission_type ADD VALUE 'TEMPERATURE_LOG_QUERY';
        "#
        )?;
    }
    sql!(
        connection,
        r#"
            ALTER TABLE store_preference ADD COLUMN vaccine_module bool NOT NULL DEFAULT false;
        "#
    )?;

    Ok(())
}
