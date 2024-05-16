use crate::{
    migrations::{sql, JSON},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    const PROPERTY_VALUE_TYPE: &str = if cfg!(feature = "postgres") {
        "PROPERTY_VALUE_TYPE" // This is created as part of the asset_catalogue_property migration
    } else {
        "TEXT"
    };

    sql!(
        connection,
        r#"
            CREATE TABLE asset_property (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL,
                name TEXT NOT NULL,
                asset_class_id TEXT,
                asset_category_id TEXT,
                asset_type_id TEXT,
                value_type {PROPERTY_VALUE_TYPE} NOT NULL,
                allowed_values TEXT
            );
            ALTER TABLE asset ADD COLUMN properties {JSON};
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_property';
            "#
        )?;
    }

    Ok(())
}
