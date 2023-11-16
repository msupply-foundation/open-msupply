use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE item_link (
            id TEXT NOT NULL PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES item(id)
        );
        "#,
    )?;

    Ok(())
}
