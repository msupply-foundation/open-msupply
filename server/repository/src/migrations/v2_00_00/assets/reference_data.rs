use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_class (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            UNIQUE (name)
        );
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_category (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            asset_class_id TEXT NOT NULL REFERENCES asset_class (id),
            UNIQUE (asset_class_id, name)
        );
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_type (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            asset_category_id TEXT NOT NULL REFERENCES asset_category (id),
            UNIQUE (asset_category_id, name)
        );
        "#,
    )?;

    Ok(())
}
