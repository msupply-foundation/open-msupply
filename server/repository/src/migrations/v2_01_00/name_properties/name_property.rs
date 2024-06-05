use crate::{
    migrations::{sql, JSON},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE name_property (
                id TEXT NOT NULL PRIMARY KEY,
                property_id TEXT NOT NULL REFERENCES property(id)
            );

            ALTER TABLE name ADD COLUMN properties {JSON};
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'name_property';
            "#
        )?;
    }

    Ok(())
}
