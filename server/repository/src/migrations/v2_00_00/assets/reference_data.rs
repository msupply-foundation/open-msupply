use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // table name asset_type is renamed to asset_catalogue_type to prevent table name clash with OG mSupply
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
        CREATE TABLE asset_catalogue_type (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            asset_category_id TEXT NOT NULL REFERENCES asset_category (id),
            UNIQUE (asset_category_id, name)
        );
        "#,
    )?;

    Ok(())
}
