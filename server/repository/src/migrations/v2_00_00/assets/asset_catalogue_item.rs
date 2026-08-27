use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_catalogue_item (
            id TEXT NOT NULL PRIMARY KEY,
            code TEXT NOT NULL,
            sub_catalogue TEXT NOT NULL,
            asset_class_id TEXT NOT NULL REFERENCES asset_class(id),
            asset_category_id TEXT NOT NULL REFERENCES asset_category(id),
            asset_catalogue_type_id TEXT NOT NULL REFERENCES asset_catalogue_type(id),
            manufacturer TEXT,
            model TEXT NOT NULL,
            deleted_datetime {DATETIME},
            UNIQUE (code)
        );
        "#,
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE activity_log_type ADD VALUE 'ASSET_CATALOGUE_ITEM_CREATED';
            "#
        )?;
    }

    Ok(())
}
