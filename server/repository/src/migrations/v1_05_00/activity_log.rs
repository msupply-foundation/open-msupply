use crate::StorageConnection;

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    use crate::migrations::sql;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE activity_log_type ADD VALUE 'SENSOR_LOCATION_CHANGED';
        "#
        )?;
    }

    Ok(())
}
