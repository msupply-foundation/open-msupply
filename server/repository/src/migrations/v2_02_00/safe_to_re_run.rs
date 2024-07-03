use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE IF NOT EXISTS some_new_table (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL
        );
        "#
    )?;

    Ok(())
}
