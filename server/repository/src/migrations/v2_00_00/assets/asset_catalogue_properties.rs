use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    const PROPERTY_VALUE_TYPE: &str = if cfg!(feature = "postgres") {
        "PROPERTY_VALUE_TYPE"
    } else {
        "TEXT"
    };

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            CREATE TYPE property_value_type AS ENUM (
                'STRING',
                'BOOLEAN',
                'INTEGER',
                'FLOAT');
            "#
        )?;
    }

    sql!(
        connection,
        r#"
            CREATE TABLE asset_catalogue_property (
                id TEXT NOT NULL PRIMARY KEY,
                asset_category_id TEXT NOT NULL REFERENCES asset_category(id),
                name TEXT NOT NULL,
                value_type {PROPERTY_VALUE_TYPE} NOT NULL,
                allowed_values TEXT
            );
            CREATE TABLE asset_catalogue_item_property (
                id TEXT NOT NULL PRIMARY KEY,
                asset_catalogue_item_id TEXT NOT NULL REFERENCES asset_catalogue_item(id),
                asset_catalogue_property_id TEXT NOT NULL REFERENCES asset_catalogue_property(id),
                value_string TEXT,
                value_int INTEGER,
                value_float {DOUBLE},
                value_bool BOOLEAN          
            );
        "#
    )?;

    Ok(())
}
