use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_catalogue (
            id TEXT NOT NULL PRIMARY KEY,
            code TEXT NOT NULL,
            asset_class_id TEXT NOT NULL REFERENCES asset_reference_data(id),
            asset_category_id TEXT NOT NULL REFERENCES asset_reference_data(id),
            asset_type_id TEXT NOT NULL REFERENCES asset_reference_data(id),
            manufacturer TEXT,
            model TEXT NOT NULL,
            catalogue TEXT NOT NULL,
        );
        "#,
    )?;

    Ok(())
}
