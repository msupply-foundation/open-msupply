use crate::{migrations::*, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE asset (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                property TEXT,
                is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
            );
        "#,
    )?;

    Ok(())
}
