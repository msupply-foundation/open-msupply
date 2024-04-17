use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE name_link (
            id TEXT NOT NULL PRIMARY KEY,
            name_id TEXT NOT NULL REFERENCES name(id)
        );
        CREATE INDEX "index_name_link_name_id_fkey" ON "name_link" ("name_id");
        INSERT INTO name_link SELECT id, id FROM name;
        "#,
    )?;

    Ok(())
}
