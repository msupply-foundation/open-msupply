use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    const PROPERTY_VALUE_TYPE: &str = if cfg!(feature = "postgres") {
        "property_value_type" // This is created as part of the asset_catalogue_property migration
    } else {
        "TEXT"
    };

    sql!(
        connection,
        r#"
            CREATE TABLE property (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL,
                name TEXT NOT NULL,
                value_type {PROPERTY_VALUE_TYPE} NOT NULL,
                allowed_values TEXT
            );
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property';
            "#
        )?;
    }

    Ok(())
}
