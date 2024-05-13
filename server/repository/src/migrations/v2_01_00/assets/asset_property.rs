use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    const ASSET_PROPERTY_VALUE_TYPE: &str = if cfg!(feature = "postgres") {
        "ASSET_PROPERTY_VALUE_TYPE"
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
            CREATE TABLE asset_property (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                value_type {ASSET_PROPERTY_VALUE_TYPE} NOT NULL,
                allowed_values TEXT
            );
            CREATE TABLE asset_item_property (
                id TEXT NOT NULL PRIMARY KEY,
                asset_id TEXT NOT NULL REFERENCES asset(id),
                asset_property_id TEXT NOT NULL REFERENCES asset_property(id),
                value_string TEXT,
                value_int INTEGER,
                value_float {DOUBLE},
                value_bool BOOLEAN          
            );
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_item_property';
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_property';
            "#
        )?;
    }

    Ok(())
}
