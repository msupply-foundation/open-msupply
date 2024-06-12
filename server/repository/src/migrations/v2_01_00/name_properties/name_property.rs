use crate::{
    migrations::{sql, JSON},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Add name_property table
    // Add properties column to name table
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

    // Add postgres enum options
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'name_property';
            ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'name_oms_fields';

            ALTER TYPE permission_type ADD VALUE 'NAME_PROPERTIES_MUTATE';
            "#
        )?;
    }

    // remove name changelog triggers (done in code now)
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                DROP TRIGGER name_upsert_trigger ON name;
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                DROP TRIGGER name_insert_trigger;
                DROP TRIGGER name_update_trigger;
            "#
        )?;
    }

    Ok(())
}
