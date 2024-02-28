use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_log (
            id SERIAL PRIMARY KEY,
            asset_id TEXT NOT NULL,
            status TEXT NOT NULL, 
            log_datetime TIMESTAMP NOT NULL
          );
        "#,
    )?;

    Ok(())
}
