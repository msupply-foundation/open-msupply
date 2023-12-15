use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE INDEX index_temperature_log_datetime ON temperature_log (datetime);
        "#,
    )?;

    Ok(())
}
