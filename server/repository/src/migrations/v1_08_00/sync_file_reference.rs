use crate::{migrations::*, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE sync_file_reference (
                id TEXT NOT NULL PRIMARY KEY,
                table_name TEXT NOT NULL, -- Associated Table
                record_id TEXT NOT NULL, -- Associated record id
                file_name TEXT NOT NULL,
                created_datetime TIMESTAMP NOT NULL, -- No modified datetime, as we don't allow updates it would break sync
                deleted_datetime TIMESTAMP
            );
        "#,
    )?;

    Ok(())
}
